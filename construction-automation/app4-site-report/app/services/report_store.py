# app/services/report_store.py
import asyncio
from datetime import datetime, timezone, timedelta
from app.database import get_db

LOCK_DAYS = 7


def _is_locked(created_at) -> bool:
    now = datetime.now(timezone.utc)
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return (now - created_at) > timedelta(days=LOCK_DAYS)


async def save_report(report_data: dict, user_id: str = None) -> str:
    db = get_db()
    doc = {"report_data": report_data, "user_id": user_id}
    result = await asyncio.to_thread(
        lambda: db.table("reports").insert(doc).execute()
    )
    return result.data[0]["id"]


async def get_reports(user_id: str, limit: int = 30) -> list:
    db = get_db()
    result = await asyncio.to_thread(
        lambda: db.table("reports")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    records = []
    for doc in result.data:
        doc["locked"] = _is_locked(doc["created_at"])
        records.append(doc)
    return records


async def get_report_by_id(report_id: str) -> dict | None:
    db = get_db()
    result = await asyncio.to_thread(
        lambda: db.table("reports").select("*").eq("id", report_id).execute()
    )
    if not result.data:
        return None
    doc = result.data[0]
    doc["locked"] = _is_locked(doc["created_at"])
    return doc