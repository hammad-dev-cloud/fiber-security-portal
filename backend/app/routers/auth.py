"""Authentication routes — login, signup, settings, forgot password, etc."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.config import settings
from app.database import supabase
from app.schemas.schemas import (
    ApproveSignupRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotUsernameRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UpdateProfileRequest,
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
from app.services.email_service import (
    send_email,
    send_password_reset_email,
    send_username_reminder_email,
    send_signup_received_email,
    send_signup_approved_email,
    send_signup_rejected_email,
)

router = APIRouter()


# =====================================================================
# LOGIN
# =====================================================================
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

    if user.get("is_pending", False):
        record_login_attempt(payload.username, client_ip, user_agent, False, "pending_approval")
        raise HTTPException(status_code=403, detail="Your account is pending admin approval. Please wait for confirmation.")

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
            "phone":     user.get("phone"),
            "role":      user.get("role", "admin"),
        },
    )


# =====================================================================
# SIGNUP (public — creates pending account, admin must approve)
# =====================================================================
@router.post("/signup", status_code=201)
async def signup(payload: SignupRequest, background_tasks: BackgroundTasks):
    existing = supabase.table("admin_users").select("id, username, email").or_(
        f"username.eq.{payload.username},email.eq.{payload.email}"
    ).execute().data
    if existing:
        raise HTTPException(status_code=409, detail="An account with this username or email already exists")

    new_row = supabase.table("admin_users").insert({
        "username":      payload.username,
        "email":         payload.email,
        "password_hash": hash_password(payload.password),
        "full_name":     payload.full_name,
        "phone":         payload.phone,
        "role":          "admin",
        "is_active":     True,
        "is_pending":    True,
    }).execute().data[0]

    background_tasks.add_task(send_signup_received_email, payload.email, payload.full_name)

    try:
        supabase.table("security_alerts").insert({
            "alert_type": "signup_pending",
            "severity":   "low",
            "target":     payload.full_name,
            "message":    f"New signup request from {payload.full_name} ({payload.email}) — awaiting approval.",
            "metadata":   {"user_id": new_row["id"], "email": payload.email},
        }).execute()
    except Exception:
        pass

    return {
        "message": "Signup successful! Your account is pending admin approval. You will receive an email once approved.",
        "user_id": new_row["id"],
    }


# =====================================================================
# ADMIN — list and approve/reject pending signups
# =====================================================================
@router.get("/pending-signups", response_model=list[UserOut])
async def list_pending_signups(_: dict = Depends(require_role("admin"))):
    rows = (
        supabase.table("admin_users")
        .select("*")
        .eq("is_pending", True)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return [UserOut(**r) for r in rows]


@router.post("/pending-signups/{user_id}/decide")
async def decide_signup(
    user_id: int,
    payload: ApproveSignupRequest,
    background_tasks: BackgroundTasks,
    current: dict = Depends(require_role("admin")),
):
    rows = supabase.table("admin_users").select("*").eq("id", user_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    user = rows[0]

    if not user.get("is_pending"):
        raise HTTPException(status_code=400, detail="This user is not pending approval")

    if payload.approve:
        supabase.table("admin_users").update({"is_pending": False}).eq("id", user_id).execute()
        background_tasks.add_task(send_signup_approved_email, user["email"], user.get("full_name") or user["username"])
        return {"status": "approved", "user_id": user_id}
    else:
        supabase.table("admin_users").delete().eq("id", user_id).execute()
        background_tasks.add_task(send_signup_rejected_email, user["email"], user.get("full_name") or user["username"])
        return {"status": "rejected", "user_id": user_id}


# =====================================================================
# REGISTER (admin only — create active user directly)
# =====================================================================
@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: RegisterRequest, _: dict = Depends(require_role("admin"))):
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
        "is_active":     True,
        "is_pending":    False,
    }).execute().data[0]

    return UserOut(**new_row)


# =====================================================================
# ME — get / update profile
# =====================================================================
@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    rows = supabase.table("admin_users").select("*").eq("id", user["id"]).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**rows[0])


@router.put("/me", response_model=UserOut)
async def update_my_profile(payload: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "username" in update_data:
        existing = supabase.table("admin_users").select("id").eq("username", update_data["username"]).neq("id", user["id"]).execute().data
        if existing:
            raise HTTPException(status_code=409, detail="This username is already taken")

    if "email" in update_data:
        existing = supabase.table("admin_users").select("id").eq("email", update_data["email"]).neq("id", user["id"]).execute().data
        if existing:
            raise HTTPException(status_code=409, detail="This email is already in use")

    updated = supabase.table("admin_users").update(update_data).eq("id", user["id"]).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**updated[0])


@router.post("/me/change-password")
async def change_my_password(payload: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    rows = supabase.table("admin_users").select("*").eq("id", user["id"]).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    db_user = rows[0]

    if not verify_password(payload.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    supabase.table("admin_users").update({
        "password_hash": hash_password(payload.new_password),
    }).eq("id", user["id"]).execute()

    return {"status": "ok", "message": "Password changed successfully"}


# =====================================================================
# FORGOT PASSWORD / USERNAME
# =====================================================================
@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    rows = supabase.table("admin_users").select("*").eq("email", payload.email).execute().data or []

    if rows:
        user = rows[0]
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

        supabase.table("admin_users").update({
            "reset_token":            token,
            "reset_token_expires_at": expires_at,
        }).eq("id", user["id"]).execute()

        reset_url = _build_reset_url(token)
        background_tasks.add_task(
            send_password_reset_email,
            user["email"],
            user.get("full_name") or user["username"],
            reset_url,
        )

    return {
        "message": "If an account exists with this email, a password reset link has been sent. Please check your inbox.",
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    rows = (
        supabase.table("admin_users")
        .select("*")
        .eq("reset_token", payload.token)
        .execute()
        .data
        or []
    )

    if not rows:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")

    user = rows[0]

    expires_str = user.get("reset_token_expires_at")
    if expires_str:
        try:
            expires_at = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires_at:
                supabase.table("admin_users").update({
                    "reset_token": None, "reset_token_expires_at": None,
                }).eq("id", user["id"]).execute()
                raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid reset token")

    supabase.table("admin_users").update({
        "password_hash":          hash_password(payload.new_password),
        "reset_token":            None,
        "reset_token_expires_at": None,
    }).eq("id", user["id"]).execute()

    return {"status": "ok", "message": "Password reset successfully. You can now sign in with your new password."}


@router.post("/forgot-username")
async def forgot_username(payload: ForgotUsernameRequest, background_tasks: BackgroundTasks):
    rows = supabase.table("admin_users").select("*").eq("email", payload.email).execute().data or []

    if rows:
        user = rows[0]
        background_tasks.add_task(
            send_username_reminder_email,
            user["email"],
            user.get("full_name") or user["username"],
            user["username"],
        )

    return {
        "message": "If an account exists with this email, your username has been sent to your inbox.",
    }


# =====================================================================
# Health check endpoint (for Render keep-alive cron job)
# =====================================================================
@router.get("/ping")
async def ping():
    """Lightweight endpoint for uptime monitors / cron job pings."""
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}


# =====================================================================
# Helpers
# =====================================================================
def _maybe_raise_brute_force(client_ip: str | None, username: str | None):
    if not client_ip:
        return
    fails = recent_failed_attempts(client_ip)
    if fails >= settings.BRUTE_FORCE_MAX_ATTEMPTS:
        raise_brute_force_alert(client_ip, fails, username)


def _build_reset_url(token: str) -> str:
    """Construct the password-reset URL using FRONTEND_URL setting."""
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?token={token}"
