"""Dashboard aggregate statistics — used by the home page."""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.database import supabase
from app.security.jwt_handler import get_current_user

router = APIRouter()


@router.get("/stats")
async def dashboard_stats(_: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # Customers
    all_customers   = supabase.table("customers").select("id, status, expiry_date").execute().data or []
    total_customers = len(all_customers)
    active          = sum(1 for c in all_customers if c.get("status") == "active")
    expired         = sum(1 for c in all_customers if c.get("status") == "expired")
    suspended       = sum(1 for c in all_customers if c.get("status") == "suspended")

    expiring_soon = sum(
        1 for c in all_customers
        if c.get("status") == "active"
        and c.get("expiry_date")
        and date.fromisoformat(c["expiry_date"]) <= date.today() + timedelta(days=3)
    )

    # Routers
    all_routers       = supabase.table("routers").select("id, status").execute().data or []
    total_routers     = len(all_routers)
    routers_online    = sum(1 for r in all_routers if r.get("status") == "online")
    routers_offline   = sum(1 for r in all_routers if r.get("status") == "offline")

    # Alerts (last 7 days)
    recent_alerts = (
        supabase.table("security_alerts")
        .select("id, severity, is_resolved")
        .gte("created_at", seven_days_ago)
        .execute()
        .data
        or []
    )
    open_alerts          = sum(1 for a in recent_alerts if not a.get("is_resolved"))
    critical_open_alerts = sum(1 for a in recent_alerts if a.get("severity") in ("critical", "high") and not a.get("is_resolved"))

    # Revenue this month
    first_of_month = date.today().replace(day=1).isoformat()
    payments_this_month = (
        supabase.table("payments")
        .select("amount_pkr")
        .gte("paid_at", first_of_month)
        .eq("status", "paid")
        .execute()
        .data
        or []
    )
    revenue_pkr = sum(float(p.get("amount_pkr") or 0) for p in payments_this_month)

    return {
        "customers": {
            "total":         total_customers,
            "active":        active,
            "expired":       expired,
            "suspended":     suspended,
            "expiring_soon": expiring_soon,
        },
        "routers": {
            "total":   total_routers,
            "online":  routers_online,
            "offline": routers_offline,
        },
        "alerts": {
            "open":           open_alerts,
            "critical_open":  critical_open_alerts,
            "last_7_days":    len(recent_alerts),
        },
        "revenue_this_month_pkr": revenue_pkr,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/recent-alerts")
async def recent_alerts(limit: int = 10, _: dict = Depends(get_current_user)):
    return (
        supabase.table("security_alerts")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )


@router.get("/recent-customers")
async def recent_customers(limit: int = 5, _: dict = Depends(get_current_user)):
    return (
        supabase.table("customers")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )
