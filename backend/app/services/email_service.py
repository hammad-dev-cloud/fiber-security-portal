"""Email notification service — uses fastapi-mail (SMTP)."""

import os
import tempfile
from typing import List, Optional

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr

from app.config import settings


def _build_config() -> Optional[ConnectionConfig]:
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


async def send_email(recipients, subject, html_body, attachments=None):
    config = _build_config()
    if not config:
        print(f"[email] SMTP not configured — would have sent to {recipients}: {subject}")
        return False
    try:
        message = MessageSchema(
            subject = subject, recipients = recipients, body = html_body,
            subtype = MessageType.html, attachments = attachments or [],
        )
        await FastMail(config).send_message(message)
        print(f"[email] sent to {recipients}: {subject}")
        return True
    except Exception as exc:
        print(f"[email] send failed: {exc}")
        return False


_BASE_CSS = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6fa; padding: 32px;"
_CARD_CSS = "max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 6px 24px rgba(15,23,42,0.05);"


def _wrap(title, body_html, accent="#0ea5e9"):
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


# =====================================================================
# Standard notifications
# =====================================================================
async def send_package_expiry_notice(to, customer_name, days_left):
    body = f"""
      <p>Dear <strong>{customer_name}</strong>,</p>
      <p>This is a formal reminder that your internet subscription is scheduled to expire in <strong>{days_left} day(s)</strong>.</p>
      <p>To avoid any interruption in your service, we kindly request that you renew your subscription at your earliest convenience.</p>
      <p>Thank you for being a valued customer.</p>
    """
    return await send_email([to], "Your fiber package is expiring soon", _wrap("Package Expiry Reminder", body, "#f59e0b"))


async def send_security_alert(to, alert_type, message, severity="medium"):
    accent = {"critical": "#dc2626", "high": "#ef4444", "medium": "#f59e0b", "low": "#0ea5e9"}.get(severity, "#0ea5e9")
    body = f"""
      <p><strong>Alert type:</strong> {alert_type}</p>
      <p><strong>Severity:</strong> <span style="color:{accent}; font-weight:600; text-transform:uppercase;">{severity}</span></p>
      <p>{message}</p>
      <p>Please log in to the Fiber Security Portal for full details.</p>
    """
    return await send_email([to], f"[{severity.upper()}] Security alert — {alert_type}", _wrap("Security Alert", body, accent))


async def send_router_offline_notice(to, router_name, customer_name):
    body = f"""
      <p>The router <strong>{router_name}</strong> linked to customer <strong>{customer_name}</strong> has been offline for an extended period.</p>
      <p>The on-call engineer should verify the customer's connection.</p>
    """
    return await send_email([to], f"Router offline — {router_name}", _wrap("Router Disconnection Notice", body, "#ef4444"))


async def send_payment_receipt(to, customer_name, amount_pkr, package_name, period_end, pdf_bytes, invoice_number):
    amount_str = f"Rs. {float(amount_pkr or 0):,.0f}"
    body = f"""
      <p>Dear <strong>{customer_name}</strong>,</p>
      <p>We are pleased to confirm that we have received your payment for the <strong>{package_name}</strong> subscription.</p>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin:18px 0;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="color:#64748b; font-size:13px;">Invoice Number</span>
          <span style="color:#0f172a; font-weight:600; font-size:13px;">{invoice_number}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="color:#64748b; font-size:13px;">Amount Paid</span>
          <span style="color:#059669; font-weight:700; font-size:15px;">{amount_str}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#64748b; font-size:13px;">Valid Until</span>
          <span style="color:#0f172a; font-weight:600; font-size:13px;">{period_end}</span>
        </div>
      </div>
      <p>Your subscription has been successfully activated and your service is now live. A detailed receipt is attached to this email for your records.</p>
      <p>We thank you for your continued trust in our service. Should you require any assistance, please do not hesitate to contact our support team.</p>
      <p style="margin-top:18px;">Sincerely,<br>
      <strong style="color:#0f172a;">Fiber Security Portal</strong><br>
      <span style="color:#64748b; font-size:13px;">Customer Service Department</span></p>
    """

    tmp = tempfile.NamedTemporaryFile(prefix=f"{invoice_number}_", suffix=".pdf", delete=False)
    try:
        tmp.write(pdf_bytes); tmp.close()
        attachments = [{
            "file": tmp.name,
            "headers": {"Content-ID": "<receipt>", "Content-Disposition": f'attachment; filename="{invoice_number}.pdf"'},
            "mime_type": "application", "mime_subtype": "pdf",
        }]
        return await send_email([to], f"Payment Receipt — {invoice_number}",
                                 _wrap("Payment Received — Thank You", body, "#059669"), attachments=attachments)
    finally:
        try: os.unlink(tmp.name)
        except Exception: pass


# =====================================================================
# Password reset
# =====================================================================
async def send_password_reset_email(to, full_name, reset_url):
    body = f"""
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>We received a request to reset the password for your Fiber Security Portal account.</p>
      <p>To set a new password, please click the button below. This link will expire in <strong>1 hour</strong>.</p>
      <div style="text-align:center; margin: 24px 0;">
        <a href="{reset_url}"
           style="display:inline-block; background:#0ea5e9; color:#ffffff; padding:12px 28px;
                  text-decoration:none; border-radius:10px; font-weight:600; font-size:14px;">
          Reset My Password
        </a>
      </div>
      <p style="color:#64748b; font-size:13px;">
        Or copy and paste this link into your browser:<br>
        <span style="word-break:break-all; color:#0ea5e9;">{reset_url}</span>
      </p>
      <p style="margin-top:24px; padding:12px; background:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; font-size:13px; color:#78350f;">
        <strong>Security notice:</strong> If you did not request this reset, please ignore this email — your password remains unchanged.
      </p>
    """
    return await send_email([to], "Reset your password — Fiber Security Portal", _wrap("Password Reset Request", body, "#0ea5e9"))


async def send_username_reminder_email(to, full_name, username):
    body = f"""
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>You recently requested a reminder of your username for the Fiber Security Portal.</p>
      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:18px; margin:18px 0; text-align:center;">
        <p style="margin:0; color:#0c4a6e; font-size:13px; text-transform:uppercase; letter-spacing:1px;">Your Username</p>
        <p style="margin:8px 0 0; color:#0c4a6e; font-family:monospace; font-size:20px; font-weight:700;">{username}</p>
      </div>
      <p>You can now sign in to the portal using this username.</p>
      <p style="margin-top:18px; padding:12px; background:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; font-size:13px; color:#78350f;">
        <strong>Security notice:</strong> If you did not request this reminder, please ignore this email or contact support.
      </p>
    """
    return await send_email([to], "Your username — Fiber Security Portal", _wrap("Username Reminder", body, "#0ea5e9"))


# =====================================================================
# Signup workflow
# =====================================================================
async def send_signup_received_email(to, full_name):
    body = f"""
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>Thank you for signing up for the Fiber Security Portal.</p>
      <p>We have received your account application and it is currently <strong>pending admin approval</strong>.
      You will receive another email once your account has been reviewed.</p>
      <p>This review typically takes a few hours to one business day.</p>
      <p>Thank you for your patience.</p>
    """
    return await send_email([to], "Signup received — pending approval", _wrap("Signup Application Received", body, "#0ea5e9"))


async def send_signup_approved_email(to, full_name):
    # NEW — uses FRONTEND_URL setting (production-aware)
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    body = f"""
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>Excellent news — your Fiber Security Portal account has been <strong>approved</strong> by an administrator.</p>
      <p>You can now sign in using the credentials you provided during signup.</p>
      <div style="text-align:center; margin: 24px 0;">
        <a href="{login_url}"
           style="display:inline-block; background:#10b981; color:#ffffff; padding:12px 28px;
                  text-decoration:none; border-radius:10px; font-weight:600; font-size:14px;">
          Sign In to Portal
        </a>
      </div>
      <p>Welcome aboard!</p>
    """
    return await send_email([to], "Your account has been approved!", _wrap("Account Approved", body, "#10b981"))


async def send_signup_rejected_email(to, full_name):
    body = f"""
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>Thank you for your interest in the Fiber Security Portal.</p>
      <p>Unfortunately, we are unable to approve your account application at this time.</p>
      <p>If you believe this was an error, or you would like more information, please contact our support team.</p>
    """
    return await send_email([to], "Signup application — update", _wrap("Account Application Update", body, "#ef4444"))
