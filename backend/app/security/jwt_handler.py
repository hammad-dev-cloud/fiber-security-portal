"""JWT token creation, verification, and FastAPI dependency for protected routes."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------
def create_access_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    """Sign a JWT containing `data` plus an expiry claim."""
    to_encode = data.copy()
    minutes = expires_minutes or settings.JWT_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ---------------------------------------------------------------------
# Decode
# ---------------------------------------------------------------------
def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT; raises JWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ---------------------------------------------------------------------
# Dependency — drop into any route to require a valid token
# ---------------------------------------------------------------------
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """FastAPI dependency that returns the current user payload from the JWT."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            raise credentials_exc
        return {
            "id":       payload.get("id"),
            "username": username,
            "role":     payload.get("role", "admin"),
            "email":    payload.get("email"),
        }
    except JWTError:
        raise credentials_exc


# ---------------------------------------------------------------------
# Role-restricted dependency factory
# ---------------------------------------------------------------------
def require_role(*allowed_roles: str):
    """Return a dependency that only permits users whose role is in `allowed_roles`."""

    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return role_checker
