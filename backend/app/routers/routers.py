"""Router (network equipment) CRUD + ping endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from app.database import supabase
from app.schemas.schemas import RouterCreate, RouterOut, RouterUpdate
from app.security.jwt_handler import get_current_user
from app.services.router_monitor import check_all_routers, check_router

router = APIRouter()


@router.get("/", response_model=list[RouterOut])
async def list_routers(_: dict = Depends(get_current_user)):
    return supabase.table("routers").select("*").order("id").execute().data or []


@router.get("/{router_id}", response_model=RouterOut)
async def get_router(router_id: int, _: dict = Depends(get_current_user)):
    rows = supabase.table("routers").select("*").eq("id", router_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Router not found")
    return rows[0]


@router.post("/", response_model=RouterOut, status_code=201)
async def create_router(payload: RouterCreate, _: dict = Depends(get_current_user)):
    data = payload.model_dump()
    if data.get("mac_address"):
        data["mac_address"] = data["mac_address"].upper()
    inserted = supabase.table("routers").insert(data).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to create router")
    return inserted[0]


@router.put("/{router_id}", response_model=RouterOut)
async def update_router(router_id: int, payload: RouterUpdate, _: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "mac_address" in update_data:
        update_data["mac_address"] = update_data["mac_address"].upper()
    updated = supabase.table("routers").update(update_data).eq("id", router_id).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="Router not found")
    return updated[0]


@router.delete("/{router_id}", status_code=204)
async def delete_router(router_id: int, _: dict = Depends(get_current_user)):
    deleted = supabase.table("routers").delete().eq("id", router_id).execute().data
    if not deleted:
        raise HTTPException(status_code=404, detail="Router not found")
    return None


# ---------------------------------------------------------------------
# Ping / monitoring
# ---------------------------------------------------------------------
@router.post("/{router_id}/ping")
async def ping_single_router(router_id: int, _: dict = Depends(get_current_user)):
    result = check_router(router_id)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    return {
        "router_id":       router_id,
        "status":          result.get("status"),
        "last_ping_ms":    result.get("last_ping_ms"),
        "last_checked_at": result.get("last_checked_at"),
    }


@router.post("/ping-all")
async def ping_all(_: dict = Depends(get_current_user)):
    return check_all_routers()
