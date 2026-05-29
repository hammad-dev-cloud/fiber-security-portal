"""Payment / billing records — now with email receipt on creation."""

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.database import supabase
from app.schemas.schemas import PaymentCreate, PaymentOut
from app.security.jwt_handler import get_current_user
from app.services.email_service import send_payment_receipt
from app.services.receipt_generator import generate_payment_receipt

router = APIRouter()


@router.get("/", response_model=list[PaymentOut])
async def list_payments(
    customer_id: int | None = Query(None),
    _: dict = Depends(get_current_user),
):
    q = supabase.table("payments").select("*").order("paid_at", desc=True)
    if customer_id is not None:
        q = q.eq("customer_id", customer_id)
    return q.execute().data or []


@router.post("/", response_model=PaymentOut, status_code=201)
async def create_payment(
    payload: PaymentCreate,
    background_tasks: BackgroundTasks,
    _: dict = Depends(get_current_user),
):
    data = payload.model_dump()
    # Convert date fields
    for field in ("period_start", "period_end"):
        if hasattr(data.get(field), "isoformat"):
            data[field] = data[field].isoformat()

    inserted = supabase.table("payments").insert(data).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to record payment")

    new_payment = inserted[0]

    # If payment was successful → extend customer's expiry_date to period_end
    if payload.status == "paid":
        try:
            supabase.table("customers").update({
                "expiry_date": data["period_end"],
                "status":      "active",
                "updated_at":  datetime.now(timezone.utc).isoformat(),
            }).eq("id", payload.customer_id).execute()
        except Exception as exc:
            print(f"[payments] could not extend customer expiry: {exc}")

        # ---------------------------------------------------------------
        # NEW: Send payment receipt email (background task)
        # ---------------------------------------------------------------
        background_tasks.add_task(_send_receipt_email_task, new_payment)

    return new_payment


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(payment_id: int, _: dict = Depends(get_current_user)):
    rows = supabase.table("payments").select("*").eq("id", payment_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Payment not found")
    return rows[0]


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(payment_id: int, _: dict = Depends(get_current_user)):
    deleted = supabase.table("payments").delete().eq("id", payment_id).execute().data
    if not deleted:
        raise HTTPException(status_code=404, detail="Payment not found")
    return None


# =====================================================================
# NEW: Manual resend endpoint (useful for demo / re-sending receipts)
# =====================================================================
@router.post("/{payment_id}/resend-receipt")
async def resend_receipt(payment_id: int, _: dict = Depends(get_current_user)):
    """Re-send the payment receipt email to the customer."""
    rows = supabase.table("payments").select("*").eq("id", payment_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Payment not found")

    sent = await _send_receipt_email_task(rows[0])
    return {
        "payment_id": payment_id,
        "sent":       sent,
        "note":       "If sent=false, check backend terminal — SMTP may not be configured or customer has no email."
    }


# =====================================================================
# Internal helper — load customer/package, generate PDF, send email
# =====================================================================
async def _send_receipt_email_task(payment: dict) -> bool:
    """Build receipt PDF + send email. Called as background task or from resend endpoint."""
    try:
        # 1. Load customer
        cust_rows = supabase.table("customers").select("*").eq("id", payment["customer_id"]).execute().data or []
        if not cust_rows:
            print(f"[payments] customer #{payment['customer_id']} not found — skipping receipt email")
            return False
        customer = cust_rows[0]

        if not customer.get("email"):
            print(f"[payments] customer #{customer['id']} has no email — skipping receipt email")
            return False

        # 2. Load package (optional)
        package = None
        if payment.get("package_id"):
            pkg_rows = supabase.table("packages").select("*").eq("id", payment["package_id"]).execute().data or []
            if pkg_rows:
                package = pkg_rows[0]

        # 3. Generate PDF receipt
        pdf_bytes = generate_payment_receipt(payment, customer, package)

        # 4. Compose invoice number
        invoice_no = f"INV-{datetime.now().year}-{int(payment.get('id', 0)):04d}"

        # 5. Send email with PDF attachment
        return await send_payment_receipt(
            to             = customer["email"],
            customer_name  = customer.get("full_name") or "Customer",
            amount_pkr     = payment.get("amount_pkr") or 0,
            package_name   = (package or {}).get("name") or "Internet Service",
            period_end     = payment.get("period_end") or "—",
            pdf_bytes      = pdf_bytes,
            invoice_number = invoice_no,
        )

    except Exception as exc:
        print(f"[payments] receipt email task failed: {exc}")
        import traceback
        traceback.print_exc()
        return False
