"""Security alerts — list, resolve, delete."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import supabase
from app.schemas.schemas import AlertCreate, AlertOut
from app.security.jwt_handler import get_current_user

router = APIRouter()


@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    severity:    str | None = Query(None),
    alert_type:  str | None = Query(None),
    resolved:    bool | None = Query(None),
    limit:       int = Query(100, le=500),
    _: dict = Depends(get_current_user),
):
    q = supabase.table("security_alerts").select("*").order("created_at", desc=True).limit(limit)
    if severity:
        q = q.eq("severity", severity)
    if alert_type:
        q = q.eq("alert_type", alert_type)
    if resolved is not None:
        q = q.eq("is_resolved", resolved)
    return q.execute().data or []


@router.post("/", response_model=AlertOut, status_code=201)
async def create_alert(payload: AlertCreate, _: dict = Depends(get_current_user)):
    inserted = supabase.table("security_alerts").insert(payload.model_dump()).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to create alert")
    return inserted[0]


@router.post("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(alert_id: int, _: dict = Depends(get_current_user)):
    updated = supabase.table("security_alerts").update({
        "is_resolved": True,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", alert_id).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated[0]


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: int, _: dict = Depends(get_current_user)):
    deleted = supabase.table("security_alerts").delete().eq("id", alert_id).execute().data
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return None
