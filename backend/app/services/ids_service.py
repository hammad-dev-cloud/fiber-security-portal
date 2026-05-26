"""Intrusion Detection System (IDS) service.

Provides simple, demo-grade detection routines suitable for an academic
project. Where production-grade tooling would use Scapy + raw packet
capture (which needs root and is hard to demo on Windows), we implement
equivalent logic on top of TCP connect probes and database analysis so
the project demonstrates the *concept* and runs anywhere.

Detection routines:
  • detect_port_scan       — checks if a remote host has many open ports
  • detect_suspicious_ip   — flags IPs with many failed actions in window
  • run_full_scan          — convenience that runs all routines
"""

import socket
from datetime import datetime, timedelta, timezone
from typing import List

from app.database import supabase


# Common ports we probe for the port-scan demo
COMMON_PORTS: List[int] = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 8080]


def tcp_port_open(host: str, port: int, timeout: float = 0.6) -> bool:
    """Return True if a TCP connection to host:port succeeds within `timeout` seconds."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except (socket.gaierror, OSError):
        return False


def scan_open_ports(host: str, ports: List[int] | None = None) -> List[int]:
    """Return list of open ports from the provided list on `host`."""
    ports = ports or COMMON_PORTS
    return [p for p in ports if tcp_port_open(host, p)]


def detect_port_scan(host: str, threshold: int = 5) -> dict:
    """Probe `host` for open common ports; raise alert if >= threshold are open.

    NOTE: In a real IDS you'd be detecting INCOMING scans against your network.
    For the academic demo we expose this as an outbound probe so it works
    without elevated privileges and still demonstrates the detection logic.
    """
    open_ports = scan_open_ports(host)
    suspicious = len(open_ports) >= threshold

    if suspicious:
        message = f"Host {host} exposes {len(open_ports)} common ports: {open_ports}. Possible scan target / misconfiguration."
        supabase.table("security_alerts").insert({
            "alert_type": "port_scan",
            "severity":   "medium" if len(open_ports) < 8 else "high",
            "source_ip":  host,
            "target":     host,
            "message":    message,
            "metadata":   {"open_ports": open_ports, "threshold": threshold},
        }).execute()

    return {
        "host":       host,
        "open_ports": open_ports,
        "count":      len(open_ports),
        "suspicious": suspicious,
    }


def detect_suspicious_ips(window_minutes: int = 15, threshold: int = 10) -> List[dict]:
    """Find IPs with many failed login attempts in the recent window."""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=window_minutes)).isoformat()
    rows = (
        supabase.table("login_attempts")
        .select("source_ip")
        .eq("success", False)
        .gte("attempted_at", cutoff)
        .execute()
        .data
        or []
    )

    counts: dict[str, int] = {}
    for r in rows:
        ip = r.get("source_ip")
        if ip:
            counts[ip] = counts.get(ip, 0) + 1

    suspicious = [{"source_ip": ip, "fail_count": c} for ip, c in counts.items() if c >= threshold]

    for item in suspicious:
        supabase.table("security_alerts").insert({
            "alert_type": "suspicious_activity",
            "severity":   "high",
            "source_ip":  item["source_ip"],
            "message":    (
                f"IP {item['source_ip']} had {item['fail_count']} failed login attempts "
                f"in the last {window_minutes} minutes."
            ),
            "metadata":   item,
        }).execute()

    return suspicious


def run_full_scan(host: str | None = None) -> dict:
    """Run all detection routines; returns combined report."""
    report: dict = {"timestamp": datetime.now(timezone.utc).isoformat()}
    if host:
        report["port_scan"] = detect_port_scan(host)
    report["suspicious_ips"] = detect_suspicious_ips()
    return report
