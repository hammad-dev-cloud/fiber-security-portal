"""
Fiber Security Portal — FastAPI Application Entry Point
========================================================
ISP Management & Intrusion Detection Portal
Network Security Project — Sir Syed University (CIS-242L)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import (
    alerts,
    auth,
    customers,
    dashboard,
    packages,
    payments,
    routers as routers_router,
    security,
)
from app.services.scheduler import start_scheduler, stop_scheduler


# ---------------------------------------------------------------------
# Lifespan — runs on startup / shutdown
# ---------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("  FIBER SECURITY PORTAL — Backend starting up")
    print(f"  CORS Origins   : {settings.CORS_ORIGINS}")
    print(f"  JWT Expiry     : {settings.JWT_EXPIRE_MINUTES} minutes")
    print(f"  Scheduler      : ON")
    print("=" * 60)
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()
    print("Fiber Security Portal — Backend shutting down")


# ---------------------------------------------------------------------
# App
# ---------------------------------------------------------------------
app = FastAPI(
    title="Fiber Security Portal API",
    description=(
        "Secure ISP Management & Intrusion Detection backend. "
        "Provides customer / package / payment management, router monitoring, "
        "brute-force detection, MAC verification and email alerting."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Global error handler — never leak stack traces in JSON
# ---------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log to console for debugging
    import traceback
    print(f"[ERROR] {request.method} {request.url.path}")
    traceback.print_exc()

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# ---------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------
app.include_router(auth.router,         prefix="/api/auth",       tags=["Authentication"])
app.include_router(dashboard.router,    prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(customers.router,    prefix="/api/customers",  tags=["Customers"])
app.include_router(packages.router,     prefix="/api/packages",   tags=["Packages"])
app.include_router(payments.router,     prefix="/api/payments",   tags=["Payments"])
app.include_router(routers_router.router, prefix="/api/routers",  tags=["Routers"])
app.include_router(alerts.router,       prefix="/api/alerts",     tags=["Security Alerts"])
app.include_router(security.router,     prefix="/api/security",   tags=["Security Ops"])


# ---------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    return {
        "app": "Fiber Security Portal API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}


# ---------------------------------------------------------------------
# Allow `python main.py` for convenience
# ---------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
