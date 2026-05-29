"""Application settings — loaded from .env"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # JWT
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # NEW — Frontend URL for emails (password reset link, approved email button, etc.)
    # In production this should be your deployed frontend URL (e.g., https://fiber-portal.vercel.app)
    FRONTEND_URL: str = "http://localhost:5173"

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_FROM_NAME: str = "Fiber Security Portal"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Brute-force protection
    BRUTE_FORCE_MAX_ATTEMPTS: int = 5
    BRUTE_FORCE_WINDOW_SECONDS: int = 300
    BRUTE_FORCE_LOCKOUT_SECONDS: int = 900

    # Router monitoring
    ROUTER_PING_TIMEOUT_SECONDS: int = 2
    ROUTER_MONITOR_INTERVAL_SECONDS: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
