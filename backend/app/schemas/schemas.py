"""Pydantic schemas — request bodies & response models for the API."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# =====================================================================
# AUTH
# =====================================================================
class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=4, max_length=128)


class RegisterRequest(BaseModel):
    username:  str       = Field(min_length=3, max_length=60)
    email:     EmailStr
    password:  str       = Field(min_length=6, max_length=128)
    full_name: Optional[str] = None
    role:      str       = "admin"


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         dict


class UserOut(BaseModel):
    id:        int
    username:  str
    email:     str
    full_name: Optional[str] = None
    role:      str
    is_active: bool


# =====================================================================
# PACKAGES
# =====================================================================
class PackageBase(BaseModel):
    name:          str
    speed_mbps:    int
    price_pkr:     float
    data_limit_gb: Optional[int] = None
    duration_days: int = 30
    description:   Optional[str] = None
    is_active:     bool = True


class PackageCreate(PackageBase): pass


class PackageUpdate(BaseModel):
    name:          Optional[str]   = None
    speed_mbps:    Optional[int]   = None
    price_pkr:     Optional[float] = None
    data_limit_gb: Optional[int]   = None
    duration_days: Optional[int]   = None
    description:   Optional[str]   = None
    is_active:     Optional[bool]  = None


class PackageOut(PackageBase):
    id:         int
    created_at: Optional[datetime] = None


# =====================================================================
# CUSTOMERS
# =====================================================================
class CustomerBase(BaseModel):
    full_name:   str
    email:       Optional[EmailStr] = None
    phone:       Optional[str] = None
    cnic:        Optional[str] = None
    address:     Optional[str] = None
    mac_address: str = Field(pattern=r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")
    ip_address:  str
    package_id:  Optional[int]  = None
    expiry_date: date
    status:      str = "active"
    notes:       Optional[str] = None


class CustomerCreate(CustomerBase): pass


class CustomerUpdate(BaseModel):
    full_name:   Optional[str]      = None
    email:       Optional[EmailStr] = None
    phone:       Optional[str]      = None
    cnic:        Optional[str]      = None
    address:     Optional[str]      = None
    mac_address: Optional[str]      = None
    ip_address:  Optional[str]      = None
    package_id:  Optional[int]      = None
    expiry_date: Optional[date]     = None
    status:      Optional[str]      = None
    notes:       Optional[str]      = None


class CustomerOut(CustomerBase):
    id:              int
    activation_date: Optional[date]     = None
    created_at:      Optional[datetime] = None


# =====================================================================
# ROUTERS
# =====================================================================
class RouterBase(BaseModel):
    customer_id: Optional[int] = None
    router_name: Optional[str] = None
    ip_address:  str
    mac_address: Optional[str] = None
    model:       Optional[str] = None
    location:    Optional[str] = None


class RouterCreate(RouterBase): pass


class RouterUpdate(BaseModel):
    router_name: Optional[str] = None
    ip_address:  Optional[str] = None
    mac_address: Optional[str] = None
    model:       Optional[str] = None
    location:    Optional[str] = None


class RouterOut(RouterBase):
    id:              int
    status:          str
    last_ping_ms:    Optional[int]      = None
    last_checked_at: Optional[datetime] = None


# =====================================================================
# PAYMENTS
# =====================================================================
class PaymentBase(BaseModel):
    customer_id:    int
    package_id:     Optional[int] = None
    amount_pkr:     float
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    period_start:   date
    period_end:     date
    status:         str = "paid"
    notes:          Optional[str] = None


class PaymentCreate(PaymentBase): pass


class PaymentOut(PaymentBase):
    id:      int
    paid_at: Optional[datetime] = None


# =====================================================================
# ALERTS
# =====================================================================
class AlertOut(BaseModel):
    id:          int
    alert_type:  str
    severity:    str
    source_ip:   Optional[str] = None
    source_mac:  Optional[str] = None
    target:      Optional[str] = None
    message:     str
    metadata:    Optional[dict] = None
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    created_at:  Optional[datetime] = None


class AlertCreate(BaseModel):
    alert_type: str
    severity:   str = "medium"
    source_ip:  Optional[str] = None
    source_mac: Optional[str] = None
    target:     Optional[str] = None
    message:    str
    metadata:   Optional[dict] = None


# =====================================================================
# MAC VERIFICATION
# =====================================================================
class MacVerifyRequest(BaseModel):
    mac_address: str
    ip_address:  Optional[str] = None


class MacVerifyResult(BaseModel):
    is_authorized:   bool
    customer_id:     Optional[int] = None
    customer_name:   Optional[str] = None
    expected_ip:     Optional[str] = None
    provided_ip:     Optional[str] = None
    ip_matches:      Optional[bool] = None
    message:         str
