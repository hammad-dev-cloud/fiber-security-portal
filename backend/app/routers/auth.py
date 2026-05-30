"""Authentication routes: login, register, me + user management (owner-only)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

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


# =====================================================================
# Existing endpoints
# =====================================================================
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    """Login. Records every attempt, blocks IPs after too many failures."""
    client_ip  = (request.client.host if request.client else None) or request.headers.get("x-forwarded-for")
    user_agent = request.headers.get("user-agent", "")

    if client_ip and is_ip_locked(client_ip):
        record_login_attempt(payload.username, client_ip, user_agent, False, "ip_locked")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts from your IP. Try again later.",
        )

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

    if user.get("is_pending"):
        record_login_attempt(payload.username, client_ip, user_agent, False, "pending_approval")
        raise HTTPException(status_code=403, detail="Account is pending admin approval")

    if not user.get("is_active", True):
        record_login_attempt(payload.username, client_ip, user_agent, False, "inactive")
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not verify_password(payload.password, user["password_hash"]):
        record_login_attempt(payload.username, client_ip, user_agent, False, "wrong_password")
        _maybe_raise_brute_force(client_ip, payload.username)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Success
    record_login_attempt(payload.username, client_ip, user_agent, True, "ok")
    supabase.table("admin_users").update({
        "last_login_at": datetime.now(timezone.utc).isoformat(),
        "login_count":   (user.get("login_count") or 0) + 1,
    }).eq("id", user["id"]).execute()

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
            "is_owner":  user.get("is_owner", False),
        },
    )


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


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    rows = supabase.table("admin_users").select("*").eq("id", user["id"]).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**rows[0])


# =====================================================================
# NEW — USER MANAGEMENT (Owner only)
# =====================================================================
def _require_owner(user: dict) -> dict:
    """Validate that the current user has is_owner=True in the DB."""
    rows = supabase.table("admin_users").select("is_owner").eq("id", user["id"]).execute().data or []
    if not rows or not rows[0].get("is_owner"):
        raise HTTPException(status_code=403, detail="Owner access required for this operation")
    return user


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: str  # 'admin' | 'viewer'


@router.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    """Owner-only — list every admin user with full details."""
    _require_owner(user)
    rows = (
        supabase.table("admin_users")
        .select("id, username, email, full_name, phone, role, is_owner, is_active, is_pending, last_login_at, login_count, created_at")
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )
    return rows


@router.get("/users/stats")
async def users_stats(user: dict = Depends(get_current_user)):
    """Owner-only — aggregate user statistics."""
    _require_owner(user)
    rows = supabase.table("admin_users").select("role, is_active, is_owner, is_pending, login_count").execute().data or []
    total       = len(rows)
    active      = sum(1 for r in rows if r.get("is_active") and not r.get("is_pending"))
    inactive    = sum(1 for r in rows if not r.get("is_active"))
    pending     = sum(1 for r in rows if r.get("is_pending"))
    owners      = sum(1 for r in rows if r.get("is_owner"))
    admins      = sum(1 for r in rows if r.get("role") == "admin" and not r.get("is_owner"))
    viewers     = sum(1 for r in rows if r.get("role") == "viewer")
    total_logins = sum(r.get("login_count") or 0 for r in rows)

    return {
        "total":        total,
        "active":       active,
        "inactive":     inactive,
        "pending":      pending,
        "owners":       owners,
        "admins":       admins,
        "viewers":      viewers,
        "total_logins": total_logins,
    }


@router.put("/users/{user_id}/status")
async def update_user_status(user_id: int, payload: UserStatusUpdate,
                             user: dict = Depends(get_current_user)):
    """Owner-only — activate or deactivate a user. Cannot affect owners."""
    _require_owner(user)

    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own status")

    target = supabase.table("admin_users").select("is_owner, username").eq("id", user_id).single().execute().data
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("is_owner"):
        raise HTTPException(status_code=403, detail="Owner accounts cannot be deactivated")

    updated = supabase.table("admin_users").update({
        "is_active": payload.is_active,
    }).eq("id", user_id).execute().data

    if not updated:
        raise HTTPException(status_code=500, detail="Update failed")
    return {"id": user_id, "is_active": payload.is_active, "message": "Status updated"}


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: int, payload: UserRoleUpdate,
                           user: dict = Depends(get_current_user)):
    """Owner-only — change a user's role. Cannot change owner role."""
    _require_owner(user)

    if payload.role not in ("admin", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'viewer'")

    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own role")

    target = supabase.table("admin_users").select("is_owner").eq("id", user_id).single().execute().data
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("is_owner"):
        raise HTTPException(status_code=403, detail="Owner role cannot be changed")

    supabase.table("admin_users").update({"role": payload.role}).eq("id", user_id).execute()
    return {"id": user_id, "role": payload.role, "message": "Role updated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, user: dict = Depends(get_current_user)):
    """Owner-only — permanently delete a user. Cannot delete owner or self."""
    _require_owner(user)

    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target = supabase.table("admin_users").select("is_owner, username").eq("id", user_id).single().execute().data
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("is_owner"):
        raise HTTPException(status_code=403, detail="Owner accounts cannot be deleted")

    supabase.table("admin_users").delete().eq("id", user_id).execute()
    return {"deleted": True, "id": user_id, "username": target.get("username")}


# =====================================================================
# Existing helpers / endpoints below (kept intact)
# =====================================================================
def _maybe_raise_brute_force(client_ip: str | None, username: str | None):
    if not client_ip:
        return
    fails = recent_failed_attempts(client_ip)
    from app.config import settings
    if fails >= settings.BRUTE_FORCE_MAX_ATTEMPTS:
        raise_brute_force_alert(client_ip, fails, username)


# ---------------------------------------------------------------------
# Public signup + password reset + username reminder (already added)
# These remain unchanged from previous versions.
# ---------------------------------------------------------------------
from app.schemas.schemas import (
    PublicSignupRequest,
    ForgotPasswordRequest,
    ForgotUsernameRequest,
    ResetPasswordRequest,
    PendingSignupAction,
)
from app.services.email_service import (
    send_signup_received_email,
    send_signup_approved_email,
    send_signup_rejected_email,
    send_password_reset_email,
    send_username_reminder_email,
)
from app.config import settings
import secrets


@router.post("/signup", status_code=201)
async def public_signup(payload: PublicSignupRequest, _request: Request):
    """Public signup — creates pending account."""
    existing = supabase.table("admin_users").select("id").or_(
        f"username.eq.{payload.username},email.eq.{payload.email}"
    ).execute().data
    if existing:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    supabase.table("admin_users").insert({
        "username":      payload.username,
        "email":         payload.email,
        "phone":         payload.phone,
        "password_hash": hash_password(payload.password),
        "full_name":     payload.full_name,
        "role":          "admin",
        "is_active":     False,
        "is_pending":    True,
    }).execute()

    try:
        await send_signup_received_email(payload.email, payload.full_name)
    except Exception as exc:
        print(f"[signup] email send failed: {exc}")

    return {"message": "Signup successful. Pending admin approval."}


@router.get("/pending-signups")
async def list_pending_signups(_: dict = Depends(get_current_user)):
    rows = (
        supabase.table("admin_users")
        .select("id, username, email, full_name, phone, created_at")
        .eq("is_pending", True)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return rows


@router.post("/pending-signups/{user_id}/action")
async def act_on_pending_signup(user_id: int, payload: PendingSignupAction,
                                 _: dict = Depends(get_current_user)):
    target = supabase.table("admin_users").select("*").eq("id", user_id).single().execute().data
    if not target or not target.get("is_pending"):
        raise HTTPException(status_code=404, detail="Pending signup not found")

    if payload.action == "approve":
        supabase.table("admin_users").update({
            "is_active": True, "is_pending": False,
        }).eq("id", user_id).execute()
        try:
            await send_signup_approved_email(target["email"], target.get("full_name", ""))
        except Exception as exc:
            print(f"[approve] email failed: {exc}")
        return {"message": "Approved", "id": user_id}
    elif payload.action == "reject":
        supabase.table("admin_users").delete().eq("id", user_id).execute()
        try:
            await send_signup_rejected_email(target["email"], target.get("full_name", ""))
        except Exception as exc:
            print(f"[reject] email failed: {exc}")
        return {"message": "Rejected", "id": user_id}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    rows = supabase.table("admin_users").select("*").eq("email", payload.email).limit(1).execute().data or []
    if rows:
        user = rows[0]
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc).timestamp() + 3600)
        supabase.table("admin_users").update({
            "reset_token":         token,
            "reset_token_expires": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        }).eq("id", user["id"]).execute()

        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        try:
            await send_password_reset_email(payload.email, user.get("full_name", "User"), reset_url)
        except Exception as exc:
            print(f"[forgot_password] email failed: {exc}")

    # Always return same message (security — don't leak which emails exist)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/forgot-username")
async def forgot_username(payload: ForgotUsernameRequest):
    rows = supabase.table("admin_users").select("*").eq("email", payload.email).limit(1).execute().data or []
    if rows:
        user = rows[0]
        try:
            await send_username_reminder_email(payload.email, user.get("full_name", "User"), user["username"])
        except Exception as exc:
            print(f"[forgot_username] email failed: {exc}")

    return {"message": "If an account with that email exists, a reminder has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    rows = supabase.table("admin_users").select("*").eq("reset_token", payload.token).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = rows[0]
    expires_str = user.get("reset_token_expires")
    if not expires_str or datetime.fromisoformat(expires_str.replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token has expired")

    supabase.table("admin_users").update({
        "password_hash":       hash_password(payload.new_password),
        "reset_token":         None,
        "reset_token_expires": None,
    }).eq("id", user["id"]).execute()

    return {"message": "Password reset successful"}


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return {"message": "No changes"}
    supabase.table("admin_users").update(updates).eq("id", user["id"]).execute()
    rows = supabase.table("admin_users").select("*").eq("id", user["id"]).execute().data
    return rows[0] if rows else {"message": "Updated"}


@router.put("/password")
async def change_password(payload: PasswordChange, user: dict = Depends(get_current_user)):
    rows = supabase.table("admin_users").select("*").eq("id", user["id"]).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, rows[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    supabase.table("admin_users").update({
        "password_hash": hash_password(payload.new_password),
    }).eq("id", user["id"]).execute()
    return {"message": "Password changed successfully"}
