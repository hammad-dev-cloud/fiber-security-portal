"""Payment / billing records."""

from datetime import datetime, timedelta, timezone, date

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import supabase
from app.schemas.schemas import PaymentCreate, PaymentOut
from app.security.jwt_handler import get_current_user

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
async def create_payment(payload: PaymentCreate, _: dict = Depends(get_current_user)):
    data = payload.model_dump()
    # Convert date fields
    for field in ("period_start", "period_end"):
        if hasattr(data.get(field), "isoformat"):
            data[field] = data[field].isoformat()

    inserted = supabase.table("payments").insert(data).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to record payment")

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

    return inserted[0]


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
