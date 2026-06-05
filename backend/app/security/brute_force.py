"""Brute-force / failed-login detection.

Counts failed login attempts per source IP inside a sliding window stored in
the database. After N failures the IP is considered locked-out and a high-
severity alert is generated. Email notifications are sent to all admins.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.config import settings
from app.database import supabase


def record_login_attempt(
    username: Optional[str],
    source_ip: Optional[str],
    user_agent: Optional[str],
    success: bool,
    reason: str,
) -> None:
    """Persist a login attempt row."""
    try:
        supabase.table("login_attempts").insert({
            "username":   username,
            "source_ip":  source_ip,
            "user_agent": user_agent,
            "success":    success,
            "reason":     reason,
        }).execute()
    except Exception as exc:  # never let logging kill the request
        print(f"[brute_force] could not log attempt: {exc}")


def recent_failed_attempts(source_ip: str, window_seconds: Optional[int] = None) -> int:
    """How many failed attempts from `source_ip` in the last window?"""
    if not source_ip:
        return 0
    window = window_seconds or settings.BRUTE_FORCE_WINDOW_SECONDS
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=window)).isoformat()
    try:
        resp = (
            supabase.table("login_attempts")
            .select("id", count="exact")
            .eq("source_ip", source_ip)
            .eq("success", False)
            .gte("attempted_at", cutoff)
            .execute()
        )
        return resp.count or 0
    except Exception as exc:
        print(f"[brute_force] count query failed: {exc}")
        return 0


def is_ip_locked(source_ip: str) -> bool:
    """Is this IP currently locked out due to brute-force attempts?"""
    if not source_ip:
        return False
    fails = recent_failed_attempts(source_ip, settings.BRUTE_FORCE_LOCKOUT_SECONDS)
    return fails >= settings.BRUTE_FORCE_MAX_ATTEMPTS


def raise_brute_force_alert(source_ip: str, attempts: int, username: Optional[str] = None) -> None:
    """Insert a high-severity alert in the security_alerts table.

    Also sends email notification to all active admin users.
    """
    message = (
        f"Brute-force attempt detected from {source_ip} — "
        f"{attempts} failed login attempts in the last "
        f"{settings.BRUTE_FORCE_WINDOW_SECONDS // 60} minutes."
    )

    # Step 1: Insert alert into database
    try:
        supabase.table("security_alerts").insert({
            "alert_type": "brute_force",
            "severity":   "high",
            "source_ip":  source_ip,
            "target":     username,
            "message":    message,
            "metadata":   {"attempts": attempts, "window_seconds": settings.BRUTE_FORCE_WINDOW_SECONDS},
        }).execute()
    except Exception as exc:
        print(f"[brute_force] alert insert failed: {exc}")

    # Step 2: NEW — Send email notification to all active admins
    try:
        _send_brute_force_emails(source_ip, attempts, username, message)
    except Exception as exc:
        print(f"[brute_force] email notification failed: {exc}")


def _send_brute_force_emails(source_ip: str, attempts: int,
                              username: Optional[str], message: str) -> None:
    """Send security alert email to all active admins."""
    # Fetch all active admins with emails
    try:
        admins = (
            supabase.table("admin_users")
            .select("email, full_name")
            .eq("is_active", True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        print(f"[brute_force] could not fetch admins: {exc}")
        return

    if not admins:
        print("[brute_force] no active admins to notify")
        return

    # Import here to avoid circular imports
    from app.services.email_service import send_security_alert

    detail_message = (
        f"{message}\n\n"
        f"Attempted Username: {username or 'Unknown'}\n"
        f"Source IP: {source_ip}\n"
        f"Failed Attempts: {attempts}\n"
        f"The IP has been automatically locked for "
        f"{settings.BRUTE_FORCE_LOCKOUT_SECONDS // 60} minutes."
    )

    for admin in admins:
        admin_email = admin.get("email")
        if not admin_email:
            continue
        try:
            # Run the async email function
            asyncio.run(send_security_alert(
                to=admin_email,
                alert_type="Brute Force Attack",
                message=detail_message,
                severity="high",
            ))
        except RuntimeError:
            # If event loop is already running, use a different approach
            try:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(send_security_alert(
                    to=admin_email,
                    alert_type="Brute Force Attack",
                    message=detail_message,
                    severity="high",
                ))
                loop.close()
            except Exception as exc:
                print(f"[brute_force] email to {admin_email} failed: {exc}")
        except Exception as exc:
            print(f"[brute_force] email to {admin_email} failed: {exc}")