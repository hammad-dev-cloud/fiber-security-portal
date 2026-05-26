"""Router connectivity monitor — uses ping3.

For each router in the database we send an ICMP echo and update its status
(online / offline) plus latency. When a router flips from online → offline
we generate a 'router_down' security alert.

NOTE: ICMP requires admin/root privileges on most systems. Run the backend
as administrator on Windows or with sudo on Linux for ping3 to work.
"""

from datetime import datetime, timezone
from typing import Optional

import ping3

from app.config import settings
from app.database import supabase

# ping3 prints warnings by default — silence them; we handle return values.
ping3.EXCEPTIONS = False


def ping_host(host: str, timeout: Optional[float] = None) -> Optional[float]:
    """Return latency in ms, or None if host is unreachable / on permission error."""
    if not host:
        return None
    timeout = timeout or settings.ROUTER_PING_TIMEOUT_SECONDS
    try:
        result = ping3.ping(host, timeout=timeout, unit="ms")
        if result is False or result is None:
            return None
        return round(float(result), 2)
    except (PermissionError, OSError) as exc:
        # On Windows non-admin shells ping3 raises OSError. Don't crash.
        print(f"[router_monitor] ping permission/OS error for {host}: {exc}")
        return None
    except Exception as exc:
        print(f"[router_monitor] ping failed for {host}: {exc}")
        return None


def check_router(router_id: int) -> dict:
    """Ping a single router by DB id and update its status. Returns the new status row."""
    try:
        row = supabase.table("routers").select("*").eq("id", router_id).single().execute()
    except Exception:
        return {"error": "router not found"}

    router = row.data
    if not router:
        return {"error": "router not found"}

    previous_status = router.get("status")
    latency = ping_host(router["ip_address"])
    new_status = "online" if latency is not None else "offline"

    update = {
        "status":          new_status,
        "last_ping_ms":    int(latency) if latency is not None else None,
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table("routers").update(update).eq("id", router_id).execute()

    # Log status transition
    supabase.table("router_status_logs").insert({
        "router_id": router_id,
        "status":    new_status,
        "ping_ms":   int(latency) if latency is not None else None,
    }).execute()

    # Raise an alert if the router just went down
    if previous_status == "online" and new_status == "offline":
        _raise_router_down_alert(router)

    return {**router, **update}


def check_all_routers() -> dict:
    """Ping every router; returns a small summary dict."""
    rows = supabase.table("routers").select("id").execute().data or []
    online = offline = 0
    for r in rows:
        result = check_router(r["id"])
        if result.get("status") == "online":
            online += 1
        elif result.get("status") == "offline":
            offline += 1
    return {"total": len(rows), "online": online, "offline": offline}


# ---------------------------------------------------------------------
def _raise_router_down_alert(router: dict) -> None:
    name = router.get("router_name") or f"Router #{router.get('id')}"
    message = f"Router '{name}' (IP {router.get('ip_address')}) went OFFLINE."
    try:
        supabase.table("security_alerts").insert({
            "alert_type": "router_down",
            "severity":   "high",
            "source_ip":  router.get("ip_address"),
            "target":     name,
            "message":    message,
            "metadata":   {"router_id": router.get("id")},
        }).execute()
    except Exception as exc:
        print(f"[router_monitor] alert insert failed: {exc}")
