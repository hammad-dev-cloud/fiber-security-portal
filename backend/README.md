---
title: Fiber Security Portal API
emoji: 🔒
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: ISP Management & Intrusion Detection backend API
---

# 🔐 Fiber Security Portal — Backend API

FastAPI backend for the **Fiber Security Portal** — an ISP Management & Intrusion Detection System.

## 🚀 Tech Stack

- **FastAPI** — Python web framework
- **Supabase** — PostgreSQL database (cloud)
- **bcrypt + JWT** — Authentication & authorization
- **fastapi-mail** — Email notifications (Gmail SMTP)
- **reportlab** — PDF receipt generation
- **APScheduler** — Background task scheduler
- **ping3** — Network monitoring

## 📚 API Documentation

- **Interactive docs:** `/docs`
- **Health check:** `/api/auth/ping`
- **Root:** `/`

## 🎓 Project

This is part of a Network Security academic project (CIS-242L) at Sir Syed University.

**Source repository:** [fiber-security-portal](https://github.com/hammad-dev-cloud/fiber-security-portal)

**Frontend:** Hosted separately on Vercel (React + Vite + Tailwind CSS)

## 🔒 Features

- Secure JWT authentication with brute-force protection
- Customer & package management (CRUD)
- Real-time router monitoring with ping checks
- MAC address verification & spoof detection
- Intrusion detection (port scanning, suspicious IPs)
- Email notifications (7 types including PDF receipts)
- Self-service password recovery
- Admin-approved partner signup workflow
- Session security with 15-min inactivity timeout

## 🛠️ Deployment

This Space runs as a **Docker container** on Hugging Face Spaces.
Auto-deployed via GitHub Actions on every push to `main` branch.
