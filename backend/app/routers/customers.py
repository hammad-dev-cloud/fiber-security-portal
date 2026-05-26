"""Customer CRUD."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import supabase
from app.schemas.schemas import CustomerCreate, CustomerOut, CustomerUpdate
from app.security.jwt_handler import get_current_user

router = APIRouter()


@router.get("/", response_model=list[CustomerOut])
async def list_customers(
    status: str | None = Query(None, description="Filter by status: active | expired | suspended | terminated"),
    search: str | None = Query(None, description="Search by name, email, MAC or IP"),
    _: dict = Depends(get_current_user),
):
    q = supabase.table("customers").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    if search:
        # Supabase doesn't support multi-column ilike OR easily; do client-side filter for the demo.
        rows = q.execute().data or []
        s = search.lower()
        rows = [
            r for r in rows
            if s in (r.get("full_name") or "").lower()
            or s in (r.get("email")     or "").lower()
            or s in (r.get("mac_address") or "").lower()
            or s in (r.get("ip_address")  or "").lower()
        ]
        return rows
    return q.execute().data or []


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: int, _: dict = Depends(get_current_user)):
    rows = supabase.table("customers").select("*").eq("id", customer_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Customer not found")
    return rows[0]


@router.post("/", response_model=CustomerOut, status_code=201)
async def create_customer(payload: CustomerCreate, _: dict = Depends(get_current_user)):
    # Pre-flight uniqueness checks (more friendly than 500 from DB)
    for col, val in (("mac_address", payload.mac_address.upper()), ("ip_address", payload.ip_address)):
        exists = supabase.table("customers").select("id").eq(col, val).execute().data
        if exists:
            raise HTTPException(status_code=409, detail=f"A customer with this {col.replace('_', ' ')} already exists")

    data = payload.model_dump()
    data["mac_address"] = data["mac_address"].upper()
    if isinstance(data.get("expiry_date"), (datetime,)):
        data["expiry_date"] = data["expiry_date"].isoformat()
    elif data.get("expiry_date"):
        data["expiry_date"] = data["expiry_date"].isoformat() if hasattr(data["expiry_date"], "isoformat") else data["expiry_date"]

    inserted = supabase.table("customers").insert(data).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    return inserted[0]


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(customer_id: int, payload: CustomerUpdate, _: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "mac_address" in update_data:
        update_data["mac_address"] = update_data["mac_address"].upper()
    if "expiry_date" in update_data and hasattr(update_data["expiry_date"], "isoformat"):
        update_data["expiry_date"] = update_data["expiry_date"].isoformat()

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    updated = supabase.table("customers").update(update_data).eq("id", customer_id).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated[0]


@router.delete("/{customer_id}", status_code=204)
async def delete_customer(customer_id: int, _: dict = Depends(get_current_user)):
    deleted = supabase.table("customers").delete().eq("id", customer_id).execute().data
    if not deleted:
        raise HTTPException(status_code=404, detail="Customer not found")
    return None
