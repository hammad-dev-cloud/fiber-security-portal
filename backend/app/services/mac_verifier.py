"""MAC-address verification service.

A MAC presented by a network device is checked against the customers table.
If the MAC does not exist or the linked customer's status is not 'active'
a 'mac_spoof' alert is raised.
"""

import re
from typing import Optional

from app.database import supabase
from app.schemas.schemas import MacVerifyResult

MAC_RE = re.compile(r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")


def normalize_mac(mac: str) -> str:
    """Uppercase + colon-separated form."""
    return mac.replace("-", ":").upper().strip()


def is_valid_mac(mac: str) -> bool:
    return bool(MAC_RE.match(mac))


def verify_mac(mac_address: str, provided_ip: Optional[str] = None) -> MacVerifyResult:
    """Look up a MAC; raise alert if unknown / mismatched IP."""
    if not is_valid_mac(mac_address):
        return MacVerifyResult(
            is_authorized=False,
            message="Invalid MAC address format. Expected AA:BB:CC:DD:EE:FF",
        )

    mac = normalize_mac(mac_address)

    try:
        resp = supabase.table("customers").select("*").eq("mac_address", mac).limit(1).execute()
        rows = resp.data or []
    except Exception as exc:
        print(f"[mac_verifier] DB error: {exc}")
        return MacVerifyResult(is_authorized=False, message="Database error")

    # Unknown MAC → spoof alert
    if not rows:
        supabase.table("security_alerts").insert({
            "alert_type": "mac_spoof",
            "severity":   "high",
            "source_mac": mac,
            "source_ip":  provided_ip,
            "message":    f"Unknown MAC address {mac} attempted to access the network.",
            "metadata":   {"provided_ip": provided_ip},
        }).execute()
        return MacVerifyResult(
            is_authorized=False,
            message="MAC address is NOT registered. Possible spoof attempt — alert generated.",
        )

    customer = rows[0]
    expected_ip = customer.get("ip_address")
    ip_matches  = (provided_ip is None) or (provided_ip == expected_ip)
    is_active   = customer.get("status") == "active"

    # IP mismatch → spoof alert
    if provided_ip and not ip_matches:
        supabase.table("security_alerts").insert({
            "alert_type": "mac_spoof",
            "severity":   "high",
            "source_mac": mac,
            "source_ip":  provided_ip,
            "target":     customer.get("full_name"),
            "message":    (
                f"MAC {mac} belongs to {customer.get('full_name')} but came from IP {provided_ip} "
                f"(expected {expected_ip}). Possible spoof."
            ),
            "metadata":   {"expected_ip": expected_ip, "provided_ip": provided_ip},
        }).execute()

    return MacVerifyResult(
        is_authorized = is_active and ip_matches,
        customer_id   = customer.get("id"),
        customer_name = customer.get("full_name"),
        expected_ip   = expected_ip,
        provided_ip   = provided_ip,
        ip_matches    = ip_matches,
        message       = (
            "Verified — MAC is registered and active."
            if is_active and ip_matches
            else "MAC is registered but verification failed (IP mismatch or inactive subscription)."
        ),
    )
