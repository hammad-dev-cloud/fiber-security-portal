"""
PDF Receipt Generator — Modern Dark Theme
==========================================
Generates professional invoice PDFs for fiber payments.
Used by payment router → emailed to customers as attachment.
"""

from datetime import datetime
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

# =====================================================================
# Theme — matches frontend dark/cyan palette
# =====================================================================
INK_950   = colors.HexColor("#0e1424")    # Page background
INK_900   = colors.HexColor("#1a2238")    # Card background
INK_800   = colors.HexColor("#27304a")    # Lighter surface
INK_700   = colors.HexColor("#3b455c")    # Border
INK_300   = colors.HexColor("#aeb6c8")    # Muted text
INK_100   = colors.HexColor("#eceff5")    # Body text
WHITE     = colors.HexColor("#ffffff")    # Headings
CYAN      = colors.HexColor("#22d3ee")    # Accent (cyan)
ACCENT    = colors.HexColor("#00e0c7")    # Accent (teal)
EMERALD   = colors.HexColor("#10b981")    # Success

PAGE_W, PAGE_H = A4

# =====================================================================
# Helpers
# =====================================================================
def _format_pkr(amount) -> str:
    n = float(amount or 0)
    return f"Rs. {n:,.0f}"

def _format_date(d) -> str:
    if not d:
        return "—"
    try:
        if isinstance(d, str):
            d = datetime.fromisoformat(d.replace("Z", "+00:00"))
        return d.strftime("%d %b %Y")
    except Exception:
        return str(d)

def _format_datetime(d) -> str:
    if not d:
        return "—"
    try:
        if isinstance(d, str):
            d = datetime.fromisoformat(d.replace("Z", "+00:00"))
        return d.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return str(d)


# =====================================================================
# Main generator
# =====================================================================
def generate_payment_receipt(
    payment: dict,
    customer: dict,
    package: Optional[dict] = None,
) -> bytes:
    """
    Generate a professional PDF receipt and return as bytes.

    Args:
        payment:  dict with id, amount_pkr, payment_method, transaction_id,
                  period_start, period_end, paid_at, status
        customer: dict with full_name, email, phone, address, cnic, ip_address
        package:  dict with name, speed_mbps, data_limit_gb, duration_days (optional)

    Returns:
        PDF file content as bytes.
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    # =================================================================
    # PAGE BACKGROUND
    # =================================================================
    c.setFillColor(INK_950)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Subtle aurora glow (top-left)
    c.setFillColor(colors.HexColor("#22d3ee"))
    c.setFillAlpha(0.04)
    c.circle(0, PAGE_H, 250, fill=1, stroke=0)
    c.setFillAlpha(1)

    # =================================================================
    # HEADER STRIP
    # =================================================================
    # Cyan accent line at very top
    c.setFillColor(CYAN)
    c.rect(0, PAGE_H - 4, PAGE_W, 4, fill=1, stroke=0)

    # Brand mark (logo box)
    logo_x = 25 * mm
    logo_y = PAGE_H - 35 * mm
    c.setFillColor(CYAN)
    c.roundRect(logo_x, logo_y, 14 * mm, 14 * mm, 3, fill=1, stroke=0)
    c.setFillColor(INK_950)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(logo_x + 7 * mm, logo_y + 4.5 * mm, "🔒")

    # Brand text
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(logo_x + 18 * mm, logo_y + 8 * mm, "FIBER SECURITY PORTAL")
    c.setFillColor(INK_300)
    c.setFont("Helvetica", 8)
    c.drawString(logo_x + 18 * mm, logo_y + 3 * mm, "ISP MANAGEMENT  •  PAYMENT RECEIPT")

    # =================================================================
    # INVOICE BADGE (top right)
    # =================================================================
    badge_x = PAGE_W - 25 * mm
    badge_y = PAGE_H - 35 * mm

    c.setFillColor(EMERALD)
    c.setFillAlpha(0.15)
    c.roundRect(badge_x - 40 * mm, badge_y + 7 * mm, 40 * mm, 7 * mm, 3.5, fill=1, stroke=0)
    c.setFillAlpha(1)
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(badge_x - 3 * mm, badge_y + 9.5 * mm, "● PAID")

    # Invoice number
    invoice_no = f"INV-{datetime.now().year}-{int(payment.get('id', 0)):04d}"
    c.setFillColor(INK_300)
    c.setFont("Helvetica", 8)
    c.drawRightString(badge_x, badge_y + 2 * mm, "INVOICE NUMBER")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(badge_x, badge_y - 4 * mm, invoice_no)

    # =================================================================
    # MAIN CARD
    # =================================================================
    card_x = 20 * mm
    card_y = 25 * mm
    card_w = PAGE_W - 40 * mm
    card_h = PAGE_H - 75 * mm

    c.setFillColor(INK_900)
    c.setStrokeColor(INK_700)
    c.setLineWidth(0.5)
    c.roundRect(card_x, card_y, card_w, card_h, 6, fill=1, stroke=1)

    # =================================================================
    # AMOUNT — Hero section
    # =================================================================
    top_y = card_y + card_h - 18 * mm
    c.setFillColor(INK_300)
    c.setFont("Helvetica", 8)
    c.drawString(card_x + 10 * mm, top_y, "AMOUNT PAID")

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(card_x + 10 * mm, top_y - 12 * mm, _format_pkr(payment.get("amount_pkr")))

    # Right side — payment status info
    c.setFillColor(INK_300)
    c.setFont("Helvetica", 8)
    c.drawRightString(card_x + card_w - 10 * mm, top_y, "PAYMENT DATE")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(card_x + card_w - 10 * mm, top_y - 6 * mm, _format_datetime(payment.get("paid_at") or datetime.now()))

    # Divider
    div_y = top_y - 22 * mm
    c.setStrokeColor(INK_700)
    c.setLineWidth(0.5)
    c.line(card_x + 10 * mm, div_y, card_x + card_w - 10 * mm, div_y)

    # =================================================================
    # TWO COLUMN — Billed To + Payment Details
    # =================================================================
    col_y = div_y - 6 * mm
    col1_x = card_x + 10 * mm
    col2_x = card_x + card_w / 2 + 5 * mm

    # ----- LEFT: Billed To -----
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(col1_x, col_y, "BILLED TO")

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(col1_x, col_y - 6 * mm, customer.get("full_name") or "—")

    c.setFillColor(INK_100)
    c.setFont("Helvetica", 9)
    y = col_y - 12 * mm
    line_h = 4.5 * mm

    if customer.get("email"):
        c.drawString(col1_x, y, customer["email"])
        y -= line_h
    if customer.get("phone"):
        c.drawString(col1_x, y, customer["phone"])
        y -= line_h
    if customer.get("cnic"):
        c.setFillColor(INK_300)
        c.drawString(col1_x, y, f"CNIC: {customer['cnic']}")
        c.setFillColor(INK_100)
        y -= line_h
    if customer.get("address"):
        # Wrap long addresses
        addr = customer["address"]
        max_chars = 38
        if len(addr) > max_chars:
            line1 = addr[:max_chars].rsplit(" ", 1)[0]
            line2 = addr[len(line1):].strip()
            c.drawString(col1_x, y, line1)
            y -= line_h
            c.drawString(col1_x, y, line2)
        else:
            c.drawString(col1_x, y, addr)
        y -= line_h

    # ----- RIGHT: Payment Details -----
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(col2_x, col_y, "PAYMENT DETAILS")

    details = [
        ("Method",          (payment.get("payment_method") or "—").upper()),
        ("Transaction ID",  payment.get("transaction_id") or "—"),
        ("Status",          (payment.get("status") or "paid").upper()),
        ("IP Address",      customer.get("ip_address") or "—"),
    ]

    y = col_y - 6 * mm
    for label, value in details:
        c.setFillColor(INK_300)
        c.setFont("Helvetica", 8)
        c.drawString(col2_x, y, label.upper())
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(col2_x, y - 4 * mm, str(value))
        y -= 11 * mm

    # =================================================================
    # PACKAGE / ITEMS TABLE
    # =================================================================
    table_y = col_y - 65 * mm
    table_x = card_x + 10 * mm
    table_w = card_w - 20 * mm

    # Table header
    c.setFillColor(INK_800)
    c.roundRect(table_x, table_y, table_w, 9 * mm, 2, fill=1, stroke=0)

    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(table_x + 4 * mm, table_y + 3 * mm, "DESCRIPTION")
    c.drawCentredString(table_x + table_w * 0.55, table_y + 3 * mm, "PERIOD")
    c.drawRightString(table_x + table_w - 4 * mm, table_y + 3 * mm, "AMOUNT")

    # Row
    row_y = table_y - 14 * mm
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 11)
    pkg_name = package.get("name") if package else "Internet Service"
    c.drawString(table_x + 4 * mm, row_y + 4 * mm, pkg_name)

    # Package speed/data sub-line
    if package:
        speed = f"{package.get('speed_mbps', '?')} Mbps"
        data  = "Unlimited" if not package.get("data_limit_gb") else f"{package.get('data_limit_gb')} GB"
        c.setFillColor(INK_300)
        c.setFont("Helvetica", 8)
        c.drawString(table_x + 4 * mm, row_y, f"{speed}  •  {data}  •  {package.get('duration_days', 30)} days validity")

    # Period
    period = f"{_format_date(payment.get('period_start'))}  →  {_format_date(payment.get('period_end'))}"
    c.setFillColor(INK_100)
    c.setFont("Helvetica", 9)
    c.drawCentredString(table_x + table_w * 0.55, row_y + 2 * mm, period)

    # Amount
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(table_x + table_w - 4 * mm, row_y + 2 * mm, _format_pkr(payment.get("amount_pkr")))

    # Bottom border
    c.setStrokeColor(INK_700)
    c.setLineWidth(0.5)
    c.line(table_x, row_y - 3 * mm, table_x + table_w, row_y - 3 * mm)

    # =================================================================
    # TOTAL
    # =================================================================
    total_y = row_y - 14 * mm
    c.setFillColor(INK_300)
    c.setFont("Helvetica", 9)
    c.drawRightString(table_x + table_w - 35 * mm, total_y, "TOTAL PAID")

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(table_x + table_w - 4 * mm, total_y - 1 * mm, _format_pkr(payment.get("amount_pkr")))

    # =================================================================
    # FOOTER (inside card)
    # =================================================================
    footer_y = card_y + 8 * mm
    c.setStrokeColor(INK_700)
    c.setLineWidth(0.5)
    c.line(card_x + 10 * mm, footer_y + 6 * mm, card_x + card_w - 10 * mm, footer_y + 6 * mm)

    c.setFillColor(INK_300)
    c.setFont("Helvetica", 8)
    c.drawString(card_x + 10 * mm, footer_y, "Thank you for your business. This is a computer-generated receipt.")
    c.drawRightString(card_x + card_w - 10 * mm, footer_y, "support@fibersecurityportal.com")

    # =================================================================
    # OUTSIDE CARD — Page footer
    # =================================================================
    c.setFillColor(INK_300)
    c.setFont("Helvetica", 7)
    c.drawCentredString(PAGE_W / 2, 12 * mm, "FIBER SECURITY PORTAL  •  ISP MANAGEMENT & INTRUSION DETECTION SYSTEM")
    c.setFillColor(INK_700)
    c.drawCentredString(PAGE_W / 2, 7 * mm, f"Generated on {_format_datetime(datetime.now())}")

    # =================================================================
    # SAVE
    # =================================================================
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
