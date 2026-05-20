# app/database.py
from supabase import create_client, Client
from os import environ
from typing import Optional

_client: Optional[Client] = None


def init_supabase() -> None:
    global _client
    url = environ.get("SUPABASE_URL")
    key = environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set."
        )
    _client = create_client(url, key)
    print("[DB] Supabase client initialised")


def get_db() -> Client:
    if _client is None:
        raise RuntimeError("Supabase not initialised. Call init_supabase() first.")
    return _client