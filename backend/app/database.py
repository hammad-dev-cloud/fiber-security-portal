"""Supabase client wrapper — single shared instance."""

from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached Supabase client.

    Uses the SERVICE_ROLE key (configured in .env) so backend operations
    bypass Row-Level-Security. Never expose this key to the frontend.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise RuntimeError(
            "Supabase credentials missing. Set SUPABASE_URL and SUPABASE_KEY in your .env file."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# Convenience alias used by routers/services
supabase: Client = get_supabase()
