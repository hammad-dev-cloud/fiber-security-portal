"""Security operations — MAC verification, IDS scans, port checks."""

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.schemas import MacVerifyRequest, MacVerifyResult
from app.security.jwt_handler import get_current_user
from app.services.ids_service import (
    detect_port_scan,
    detect_suspicious_ips,
    run_full_scan,
)
from app.services.mac_verifier import verify_mac

router = APIRouter()


# ---------------------------------------------------------------------
# MAC verification
# ---------------------------------------------------------------------
@router.post("/verify-mac", response_model=MacVerifyResult)
async def verify_mac_endpoint(payload: MacVerifyRequest, _: dict = Depends(get_current_user)):
    return verify_mac(payload.mac_address, payload.ip_address)


# ---------------------------------------------------------------------
# IDS scans
# ---------------------------------------------------------------------
@router.post("/scan/port")
async def port_scan_endpoint(host: str, _: dict = Depends(get_current_user)):
    if not host or len(host) > 255:
        raise HTTPException(status_code=400, detail="Invalid host")
    return detect_port_scan(host)


@router.get("/scan/suspicious-ips")
async def suspicious_ips_endpoint(window_minutes: int = 15, threshold: int = 10, _: dict = Depends(get_current_user)):
    return detect_suspicious_ips(window_minutes=window_minutes, threshold=threshold)


@router.post("/scan/full")
async def full_scan_endpoint(host: str | None = None, _: dict = Depends(get_current_user)):
    return run_full_scan(host=host)

# ---------------------------------------------------------------------
# Email testing endpoints (for demo / testing only)
# ---------------------------------------------------------------------
from app.services.email_service import (
    send_package_expiry_notice,
    send_security_alert,
    send_router_offline_notice,
)


@router.post("/test-email/expiry")
async def test_expiry_email(to_email: str, _: dict = Depends(get_current_user)):
    """Send a sample package-expiry email to the given address."""
    sent = await send_package_expiry_notice(to_email, "Test Customer", days_left=2)
    return {"sent": sent, "type": "package_expiry", "to": to_email,
            "note": "If sent=false, check backend terminal — SMTP may not be configured."}


@router.post("/test-email/alert")
async def test_alert_email(to_email: str, _: dict = Depends(get_current_user)):
    """Send a sample security-alert email to the given address."""
    sent = await send_security_alert(
        to_email,
        alert_type="brute_force",
        message="Test brute-force attempt detected from IP 192.168.1.55 — 5 failed attempts.",
        severity="high",
    )
    return {"sent": sent, "type": "security_alert", "to": to_email}


@router.post("/test-email/router-down")
async def test_router_down_email(to_email: str, _: dict = Depends(get_current_user)):
    """Send a sample router-offline email to the given address."""
    sent = await send_router_offline_notice(to_email, "Test-Router", "Test Customer")
    return {"sent": sent, "type": "router_offline", "to": to_email}