"""Authentication routes: login, register (admin only), me."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.database import supabase
from app.schemas.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.security.brute_force import (
    is_ip_locked,
    raise_brute_force_alert,
    recent_failed_attempts,
    record_login_attempt,
)
from app.security.hashing import hash_password, verify_password
from app.security.jwt_handler import create_access_token, get_current_user, require_role

router = APIRouter()


# ---------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    """Login. Records every attempt, blocks IPs after too many failures."""
    client_ip  = (request.client.host if request.client else None) or request.headers.get("x-forwarded-for")
    user_agent = request.headers.get("user-agent", "")

    # Hard lock-out check
    if client_ip and is_ip_locked(client_ip):
        record_login_attempt(payload.username, client_ip, user_agent, False, "ip_locked")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts from your IP. Try again later.",
        )

    # Lookup user
    try:
        resp = supabase.table("admin_users").select("*").eq("username", payload.username).limit(1).execute()
        users = resp.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    if not users:
        record_login_attempt(payload.username, client_ip, user_agent, False, "user_not_found")
        _maybe_raise_brute_force(client_ip, payload.username)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = users[0]

    if not user.get("is_active", True):
        record_login_attempt(payload.username, client_ip, user_agent, False, "inactive")
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not verify_password(payload.password, user["password_hash"]):
        record_login_attempt(payload.username, client_ip, user_agent, False, "wrong_password")
        _maybe_raise_brute_force(client_ip, payload.username)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Success
    record_login_attempt(payload.username, client_ip, user_agent, True, "ok")
    supabase.table("admin_users").update(
        {"last_login_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", user["id"]).execute()

    token = create_access_token({
        "sub":   user["username"],
        "id":    user["id"],
        "role":  user.get("role", "admin"),
        "email": user.get("email"),
    })

    return TokenResponse(
        access_token=token,
        user={
            "id":        user["id"],
            "username":  user["username"],
            "email":     user["email"],
            "full_name": user.get("full_name"),
            "role":      user.get("role", "admin"),
        },
    )


# ---------------------------------------------------------------------
@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: RegisterRequest, _: dict = Depends(require_role("admin"))):
    """Create a new admin/viewer account. Admin-only."""
    existing = supabase.table("admin_users").select("id").or_(
        f"username.eq.{payload.username},email.eq.{payload.email}"
    ).execute().data
    if existing:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    new_row = supabase.table("admin_users").insert({
        "username":      payload.username,
        "email":         payload.email,
        "password_hash": hash_password(payload.password),
        "full_name":     payload.full_name,
        "role":          payload.role,
    }).execute().data[0]

    return UserOut(**new_row)


# ---------------------------------------------------------------------
@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    """Return the currently logged-in user (fresh from DB)."""
    rows = supabase.table("admin_users").select("*").eq("id", user["id"]).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**rows[0])


# =====================================================================
# Helpers
# =====================================================================
def _maybe_raise_brute_force(client_ip: str | None, username: str | None):
    if not client_ip:
        return
    fails = recent_failed_attempts(client_ip)
    from app.config import settings
    if fails >= settings.BRUTE_FORCE_MAX_ATTEMPTS:
        raise_brute_force_alert(client_ip, fails, username)
