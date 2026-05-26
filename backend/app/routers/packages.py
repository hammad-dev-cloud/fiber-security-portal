"""Package (internet plans) CRUD."""

from fastapi import APIRouter, Depends, HTTPException

from app.database import supabase
from app.schemas.schemas import PackageCreate, PackageOut, PackageUpdate
from app.security.jwt_handler import get_current_user

router = APIRouter()


@router.get("/", response_model=list[PackageOut])
async def list_packages(_: dict = Depends(get_current_user)):
    return supabase.table("packages").select("*").order("price_pkr").execute().data or []


@router.get("/{package_id}", response_model=PackageOut)
async def get_package(package_id: int, _: dict = Depends(get_current_user)):
    rows = supabase.table("packages").select("*").eq("id", package_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Package not found")
    return rows[0]


@router.post("/", response_model=PackageOut, status_code=201)
async def create_package(payload: PackageCreate, _: dict = Depends(get_current_user)):
    inserted = supabase.table("packages").insert(payload.model_dump()).execute().data
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to create package")
    return inserted[0]


@router.put("/{package_id}", response_model=PackageOut)
async def update_package(package_id: int, payload: PackageUpdate, _: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated = supabase.table("packages").update(update_data).eq("id", package_id).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="Package not found")
    return updated[0]


@router.delete("/{package_id}", status_code=204)
async def delete_package(package_id: int, _: dict = Depends(get_current_user)):
    deleted = supabase.table("packages").delete().eq("id", package_id).execute().data
    if not deleted:
        raise HTTPException(status_code=404, detail="Package not found")
    return None
