"""APScheduler integration — runs periodic tasks.

  • Every N seconds: ping all routers
  • Every 6 hours:   check for customers whose package has expired
                     + send email notifications to customers expiring soon
"""

import asyncio
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


def _send_expiry_email(customer_email: str, customer_name: str, days_left: int) -> None:
    """Send package expiry email to a customer."""
    if not customer_email:
        return
    # Import here to avoid circular imports
    from app.services.email_service import send_package_expiry_notice

    try:
        try:
            asyncio.run(send_package_expiry_notice(customer_email, customer_name, days_left))
        except RuntimeError:
            # If event loop is already running, create a new one
            loop = asyncio.new_event_loop()
            loop.run_until_complete(send_package_expiry_notice(customer_email, customer_name, days_left))
            loop.close()
        print(f"[scheduler] expiry email sent to {customer_email} ({days_left} days)")
    except Exception as exc:
        print(f"[scheduler] expiry email to {customer_email} failed: {exc}")


def _job_check_package_expiry():
    """Mark expired customers + raise alerts + send emails to expiring customers."""
    today = date.today()
    soon  = today + timedelta(days=3)

    try:
        # Step 1: Find customers about to expire (BEFORE marking as expired)
        # so we can send them "your package just expired" emails
        just_expired_rows = (
            supabase.table("customers")
            .select("id, full_name, expiry_date, email")
            .lt("expiry_date", today.isoformat())
            .eq("status", "active")
            .execute()
            .data
            or []
        )

        # Step 2: Mark them as expired in database
        supabase.table("customers").update({"status": "expired"}).lt("expiry_date", today.isoformat()).eq("status", "active").execute()

        # Step 3: Send "package expired" email to each (days_left = 0)
        for c in just_expired_rows:
            customer_email = c.get("email")
            customer_name  = c.get("full_name", "Customer")
            if customer_email:
                _send_expiry_email(customer_email, customer_name, 0)

        # Step 4: Find packages expiring within 3 days that are still active
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

        # Step 5: For each, generate alert AND send email to customer
        for c in soon_rows:
            days_left = (date.fromisoformat(c["expiry_date"]) - today).days

            # Generate alert
            supabase.table("security_alerts").insert({
                "alert_type": "package_expiry",
                "severity":   "medium",
                "target":     c.get("full_name"),
                "message":    f"Customer '{c.get('full_name')}' package expires in {days_left} day(s).",
                "metadata":   {"customer_id": c["id"], "days_left": days_left},
            }).execute()

            # NEW — Send email to customer
            customer_email = c.get("email")
            customer_name  = c.get("full_name", "Customer")
            if customer_email:
                _send_expiry_email(customer_email, customer_name, days_left)

        print(f"[scheduler] package expiry check done — "
              f"{len(just_expired_rows)} expired, {len(soon_rows)} expiring soon")
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