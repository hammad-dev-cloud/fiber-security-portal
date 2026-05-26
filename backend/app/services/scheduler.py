"""APScheduler integration — runs periodic tasks.

  • Every N seconds: ping all routers
  • Every 6 hours:   check for customers whose package has expired
"""

from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import supabase
from app.services.router_monitor import check_all_routers

scheduler = BackgroundScheduler(timezone="UTC")


# ---------------------------------------------------------------------
def _job_ping_routers():
    try:
        summary = check_all_routers()
        print(f"[scheduler] router ping → {summary}")
    except Exception as exc:
        print(f"[scheduler] router ping failed: {exc}")


def _job_check_package_expiry():
    """Mark expired customers + raise alerts for ones expiring in <= 3 days."""
    today = date.today()
    soon  = today + timedelta(days=3)

    try:
        # Mark expired
        supabase.table("customers").update({"status": "expired"}).lt("expiry_date", today.isoformat()).eq("status", "active").execute()

        # Find packages expiring within 3 days that are still active
        soon_rows = (
            supabase.table("customers")
            .select("id, full_name, expiry_date, email")
            .gte("expiry_date", today.isoformat())
            .lte("expiry_date", soon.isoformat())
            .eq("status", "active")
            .execute()
            .data
            or []
        )

        for c in soon_rows:
            days_left = (date.fromisoformat(c["expiry_date"]) - today).days
            supabase.table("security_alerts").insert({
                "alert_type": "package_expiry",
                "severity":   "medium",
                "target":     c.get("full_name"),
                "message":    f"Customer '{c.get('full_name')}' package expires in {days_left} day(s).",
                "metadata":   {"customer_id": c["id"], "days_left": days_left},
            }).execute()

        print(f"[scheduler] package expiry check done — {len(soon_rows)} expiring soon")
    except Exception as exc:
        print(f"[scheduler] expiry check failed: {exc}")


# ---------------------------------------------------------------------
def start_scheduler():
    if scheduler.running:
        return
    scheduler.add_job(
        _job_ping_routers,
        "interval",
        seconds=settings.ROUTER_MONITOR_INTERVAL_SECONDS,
        id="ping_routers",
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        _job_check_package_expiry,
        "interval",
        hours=6,
        id="check_expiry",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
