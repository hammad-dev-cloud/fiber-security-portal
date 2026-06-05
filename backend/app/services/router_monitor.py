"""Router connectivity monitor — uses TCP socket-based reachability check.

For each router in the database we attempt a TCP connection to check
reachability and measure latency. When a router flips from online → offline
we generate a 'router_down' security alert.

NOTE: We use TCP socket check instead of ICMP ping because:
  - Cloud platforms (HF Spaces, AWS, GCP, Azure) block outbound ICMP
  - TCP works through firewalls and NAT
  - No root/admin privileges required
  - Industry standard for cloud monitoring
"""

import socket
import time
from datetime import datetime, timezone
from typing import Optional

from app.config import settings
from app.database import supabase

# Common router/service ports to check — TCP connect to ANY of these = online
ROUTER_PORTS = [80, 443, 22, 8080, 23, 53]


def ping_host(host: str, timeout: Optional[float] = None) -> Optional[float]:
    """Return latency in ms, or None if host is unreachable.

    Tries multiple common ports. Returns latency of the first successful connection.
    For localhost (127.0.0.x), it's always considered reachable.
    """
    if not host:
        return None
    timeout = timeout or settings.ROUTER_PING_TIMEOUT_SECONDS

    # Special case: localhost is always reachable (demo / loopback)
    if host.startswith("127.") or host == "localhost":
        return 0.5  # fixed minimal latency for localhost

    # Validate IP format roughly (avoid socket errors on garbage input)
    parts = host.split(".")
    if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        print(f"[router_monitor] invalid IP format: {host}")
        return None

    # Try each port — first one that responds = online
    for port in ROUTER_PORTS:
        try:
            start = time.time()
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                if result == 0:
                    # Connection successful — host is online
                    latency_ms = (time.time() - start) * 1000
                    return round(latency_ms, 2)
        except (socket.timeout, socket.gaierror, OSError):
            # Try next port
            continue
        except Exception as exc:
            print(f"[router_monitor] unexpected error pinging {host}:{port} → {exc}")
            continue

    # All ports failed — host unreachable
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
    try:
        supabase.table("router_status_logs").insert({
            "router_id": router_id,
            "status":    new_status,
            "ping_ms":   int(latency) if latency is not None else None,
        }).execute()
    except Exception as exc:
        print(f"[router_monitor] status log failed: {exc}")

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