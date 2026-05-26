"""Email notification service — uses fastapi-mail (SMTP).

Three primary message types are supported:
  • Package expiry reminder
  • Intrusion / security alert
  • Router disconnection notice

Failures are swallowed and printed so they never break the API request.
Configure SMTP in `.env`.
"""

from typing import List, Optional

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr

from app.config import settings


def _build_config() -> Optional[ConnectionConfig]:
    """Return a ConnectionConfig if SMTP is configured, otherwise None."""
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD or not settings.MAIL_FROM:
        return None
    return ConnectionConfig(
        MAIL_USERNAME   = settings.MAIL_USERNAME,
        MAIL_PASSWORD   = settings.MAIL_PASSWORD,
        MAIL_FROM       = settings.MAIL_FROM,
        MAIL_FROM_NAME  = settings.MAIL_FROM_NAME,
        MAIL_PORT       = settings.MAIL_PORT,
        MAIL_SERVER     = settings.MAIL_SERVER,
        MAIL_STARTTLS   = settings.MAIL_STARTTLS,
        MAIL_SSL_TLS    = settings.MAIL_SSL_TLS,
        USE_CREDENTIALS = True,
        VALIDATE_CERTS  = True,
    )


async def send_email(recipients: List[EmailStr], subject: str, html_body: str) -> bool:
    """Send an email; returns True on success, False if SMTP is not configured or sending fails."""
    config = _build_config()
    if not config:
        print(f"[email] SMTP not configured — would have sent to {recipients}: {subject}")
        return False
    try:
        message = MessageSchema(
            subject    = subject,
            recipients = recipients,
            body       = html_body,
            subtype    = MessageType.html,
        )
        await FastMail(config).send_message(message)
        return True
    except Exception as exc:
        print(f"[email] send failed: {exc}")
        return False


# ---------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------
_BASE_CSS = """
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f4f6fa; padding: 32px;
"""

_CARD_CSS = """
  max-width: 560px; margin: 0 auto; background: #ffffff;
  border-radius: 14px; padding: 32px; border: 1px solid #e5e7eb;
  box-shadow: 0 6px 24px rgba(15,23,42,0.05);
"""


def _wrap(title: str, body_html: str, accent: str = "#0ea5e9") -> str:
    return f"""
    <div style="{_BASE_CSS}">
      <div style="{_CARD_CSS}">
        <div style="border-left: 4px solid {accent}; padding-left: 14px; margin-bottom: 18px;">
          <h2 style="margin:0; color:#0f172a; font-size:20px;">{title}</h2>
          <p style="margin:4px 0 0; color:#64748b; font-size:13px;">Fiber Security Portal</p>
        </div>
        {body_html}
        <p style="margin-top: 32px; color:#94a3b8; font-size:12px; border-top: 1px solid #f1f5f9; padding-top:16px;">
          This is an automated message from Fiber Security Portal. Do not reply.
        </p>
      </div>
    </div>
    """


async def send_package_expiry_notice(to: EmailStr, customer_name: str, days_left: int) -> bool:
    body = f"""
      <p>Hello <strong>{customer_name}</strong>,</p>
      <p>Your internet package is about to expire in <strong>{days_left} day(s)</strong>.</p>
      <p>Please renew your subscription to avoid any service interruption.</p>
    """
    return await send_email([to], "Your fiber package is expiring soon", _wrap("Package Expiry Reminder", body, "#f59e0b"))


async def send_security_alert(to: EmailStr, alert_type: str, message: str, severity: str = "medium") -> bool:
    accent = {"critical": "#dc2626", "high": "#ef4444", "medium": "#f59e0b", "low": "#0ea5e9"}.get(severity, "#0ea5e9")
    body = f"""
      <p><strong>Alert type:</strong> {alert_type}</p>
      <p><strong>Severity:</strong> <span style="color:{accent}; font-weight:600; text-transform:uppercase;">{severity}</span></p>
      <p>{message}</p>
      <p>Please log in to the Fiber Security Portal for full details.</p>
    """
    return await send_email([to], f"[{severity.upper()}] Security alert — {alert_type}", _wrap("Security Alert", body, accent))


async def send_router_offline_notice(to: EmailStr, router_name: str, customer_name: str) -> bool:
    body = f"""
      <p>The router <strong>{router_name}</strong> linked to customer <strong>{customer_name}</strong> has been offline for an extended period.</p>
      <p>The on-call engineer should verify the customer's connection.</p>
    """
    return await send_email([to], f"Router offline — {router_name}", _wrap("Router Disconnection Notice", body, "#ef4444"))
