# 🔐 Fiber Security Portal

> **Secure Fiber ISP Management & Intrusion Detection Portal**
> Network Security Project — Sir Syed University of Engineering & Technology (CIS-242L · Spring 2026)

A full-stack ISP management web application with built-in intrusion detection,
brute-force protection, router monitoring and MAC verification.

---

## ✨ Features

| Module | What it does |
|--------|--------------|
| 🔐 **Authentication**     | JWT login + bcrypt password hashing + IP-based brute-force protection |
| 👥 **Customers**          | Full CRUD with MAC/IP uniqueness, expiry tracking, status workflow |
| 📦 **Packages**           | Manage internet plans (speed, price, data limit, duration) |
| 💳 **Payments**           | Record billing, auto-extend customer expiry on payment |
| 📡 **Routers**            | Live ping monitoring (ping3) with online/offline tracking |
| 🛡️ **Security Alerts**    | Auto-generated alerts for brute force, MAC spoof, router down, etc. |
| 🔎 **MAC Verification**   | Verify device MAC against customer registry — spoof detection |
| 📊 **IDS / Port Scan**    | Basic intrusion detection routines + open-port probes |
| 📧 **Email Notifications**| Expiry reminders & security alerts via SMTP |
| ⏰ **Background Scheduler**| Auto-pings routers every minute, checks expiry every 6h |
| 📈 **Dashboard**          | Real-time stats, charts (Recharts), recent activity |

---

## 🏗️ Tech Stack

**Frontend** — React 18 · Vite · Tailwind CSS · React Router · Axios · Recharts · Lucide icons · react-hot-toast
**Backend** — FastAPI · Pydantic v2 · bcrypt · python-jose (JWT) · ping3 · fastapi-mail · APScheduler
**Database** — Supabase (PostgreSQL)

---

## 📁 Folder Structure

```
Fiber-Security-Portal/
├── backend/
│   ├── app/
│   │   ├── config.py              # Env-driven settings
│   │   ├── database.py            # Supabase client
│   │   ├── routers/               # FastAPI route modules
│   │   ├── schemas/               # Pydantic models
│   │   ├── security/              # JWT, bcrypt, brute-force
│   │   └── services/              # Email, router monitor, IDS, MAC verifier, scheduler
│   ├── database/
│   │   └── schema.sql             # ⚡ Run this in Supabase SQL Editor
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/                   # Axios client + endpoint wrappers
    │   ├── components/            # Layout, Sidebar, Modal, etc.
    │   ├── context/AuthContext.jsx
    │   ├── pages/                 # Login, Dashboard, Customers, ...
    │   ├── utils/format.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.js
    └── .env.example
```

---

## 🚀 Setup — Step by Step

### **Step 1: Set up Supabase**

1. Go to https://app.supabase.com → **New project** (free tier is fine).
2. Wait ~2 minutes for the database to provision.
3. Open **SQL Editor** (left sidebar) → **New query**.
4. Open `backend/database/schema.sql` from this project, copy **everything**, paste, click **Run**.
5. Verify: in the left sidebar, click **Table Editor** — you should see 8 tables (`admin_users`, `packages`, `customers`, `routers`, `router_status_logs`, `payments`, `security_alerts`, `login_attempts`).
6. Go to **Settings → API**:
   - Copy the **Project URL** → that's your `SUPABASE_URL`
   - Copy the **`service_role` secret** key (NOT the `anon` key) → that's your `SUPABASE_KEY`
   - ⚠️ Keep this key secret. Never push it to GitHub.

### **Step 2: Backend Setup**

```bash
cd backend

# Create + activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env template
cp .env.example .env       # macOS/Linux
copy .env.example .env     # Windows

# Now open .env and fill in:
#   SUPABASE_URL
#   SUPABASE_KEY
#   JWT_SECRET_KEY  (generate one: python -c "import secrets; print(secrets.token_urlsafe(64))")
#   MAIL_*          (optional — only if you want email notifications)

# Run the server
uvicorn main:app --reload --port 8000
```

Backend will be available at **http://localhost:8000**
Interactive API docs at **http://localhost:8000/docs**

> ⚠️ **About `ping3`**: ICMP requires admin privileges. On Windows run your terminal as Administrator. On Linux/macOS run with `sudo` *or* use `setcap`. Without admin rights the router-ping feature falls back to "offline" silently — that's a runtime limitation, not a bug.

### **Step 3: Frontend Setup**

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Copy env template
cp .env.example .env       # macOS/Linux
copy .env.example .env     # Windows

# Run the dev server
npm run dev
```

Frontend will be available at **http://localhost:5173**

### **Step 4: Login** ✨

Open **http://localhost:5173/login** in your browser.

**Default credentials** (seeded in `schema.sql`):

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `Admin@123` |

> Change this password immediately in production. To rotate it, hash a new password in Python:
> ```python
> import bcrypt
> print(bcrypt.hashpw(b"NewStrongPass!", bcrypt.gensalt(rounds=12)).decode())
> ```
> Then update the `password_hash` column in `admin_users` for username `admin`.

---

## 🧪 Quick Test Checklist

After login:

- [ ] Dashboard loads with stats from the seed data
- [ ] **Customers** page — 3 sample customers are visible
- [ ] **Packages** page — 5 plans (Starter Fiber → Business Elite)
- [ ] **Routers** page — click **Ping** on a router (needs admin rights)
- [ ] **Security Ops** page — try MAC verification with `AA:BB:CC:11:22:33` (valid) and `FF:FF:FF:FF:FF:FF` (raises a spoof alert)
- [ ] **Alerts** page — see the auto-generated alerts
- [ ] **Brute-force protection** — log out, try a wrong password 5 times. The 6th attempt returns HTTP 429 and creates a `brute_force` alert.

---

## 🔌 API Reference

Full interactive Swagger UI at **http://localhost:8000/docs** after starting the backend.

Top-level routes:

```
POST   /api/auth/login           — Login (issues JWT)
POST   /api/auth/register        — Register new admin (admin-only)
GET    /api/auth/me              — Current user

GET    /api/dashboard/stats      — Aggregate stats
GET    /api/dashboard/recent-alerts
GET    /api/dashboard/recent-customers

GET    /api/customers/           — List + filter
POST   /api/customers/           — Create
PUT    /api/customers/{id}       — Update
DELETE /api/customers/{id}       — Delete

GET    /api/packages/   POST /api/packages/   PUT /api/packages/{id}   DELETE /api/packages/{id}
GET    /api/payments/   POST /api/payments/   DELETE /api/payments/{id}
GET    /api/routers/    POST /api/routers/    PUT /api/routers/{id}    DELETE /api/routers/{id}
POST   /api/routers/{id}/ping
POST   /api/routers/ping-all

GET    /api/alerts/              — List with filters (severity, type, resolved)
POST   /api/alerts/{id}/resolve
DELETE /api/alerts/{id}

POST   /api/security/verify-mac
POST   /api/security/scan/port?host=...
GET    /api/security/scan/suspicious-ips
POST   /api/security/scan/full
```

---

## 🛠️ Troubleshooting

**❌ "Supabase credentials missing" on backend startup**
→ You haven't created `backend/.env` or it's missing `SUPABASE_URL` / `SUPABASE_KEY`. Copy `.env.example` again and fill it in.

**❌ Frontend shows "Network Error"**
→ Backend isn't running, or `VITE_API_URL` in `frontend/.env` points to the wrong place. Default is `http://localhost:8000/api`.

**❌ "CORS error" in browser console**
→ Add your frontend URL to `CORS_ORIGINS` in `backend/.env` (comma-separated). Default already includes `http://localhost:5173`.

**❌ Router ping always shows offline**
→ ping3 needs admin/root. Either restart your terminal as Administrator (Windows) / use `sudo` (Linux/macOS), or just demo the feature with `localhost` as the host since the loopback rarely needs privilege.

**❌ "Invalid token" 401 right after login**
→ You probably changed `JWT_SECRET_KEY` after issuing the token. Clear browser localStorage and log in again.

**❌ Emails not sending**
→ If using Gmail you must create an **App Password** (https://myaccount.google.com/apppasswords) — regular passwords are blocked by Google for SMTP. Set the app password as `MAIL_PASSWORD`.

---

## 🎓 Academic Notes

This project demonstrates the following **Network Security concepts** from the CIS-242L syllabus:

- **Authentication & Hashing** — bcrypt with salt + JWT bearer tokens
- **Brute-force Mitigation** — sliding-window failed-attempt counter + IP lockout
- **Intrusion Detection (IDS)** — port scanning, suspicious-IP detection, anomaly flagging
- **MAC Verification & Spoof Detection** — registry-based device authorization
- **Network Monitoring** — ICMP echo (ping) for router uptime
- **Audit Logging** — every login attempt + security event is persisted
- **Defense in Depth** — multiple overlapping security mechanisms

---

## 📜 License

Made for academic submission · CIS-242L · 2026
