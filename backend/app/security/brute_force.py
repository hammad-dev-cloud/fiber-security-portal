"""Brute-force / failed-login detection.

Counts failed login attempts per source IP inside a sliding window stored in
the database. After N failures the IP is considered locked-out and a high-
severity alert is generated.
"""

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
    """Insert a high-severity alert in the security_alerts table."""
    message = (
        f"Brute-force attempt detected from {source_ip} — "
        f"{attempts} failed login attempts in the last "
        f"{settings.BRUTE_FORCE_WINDOW_SECONDS // 60} minutes."
    )
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
