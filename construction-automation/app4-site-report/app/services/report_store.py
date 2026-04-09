# app/services/report_store.py
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from app.database import get_db

LOCK_DAYS = 7


def _is_locked(created_at: datetime) -> bool:
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return (now - created_at) > timedelta(days=LOCK_DAYS)


async def save_report(report_data: dict, user_id: str = None) -> str:
    db = get_db()
    doc = {
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "report_data": report_data,
        "locked": False,
    }
    result = await db.reports.insert_one(doc)
    return str(result.inserted_id)


async def get_reports(user_id: str = None, limit: int = 30) -> list:
    db = get_db()
    query = {"user_id": user_id} if user_id else {}
    cursor = db.reports.find(query).sort("created_at", -1).limit(limit)
    records = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        doc["locked"] = _is_locked(doc["created_at"])
        records.append(doc)
    return records


async def get_report_by_id(report_id: str) -> dict | None:
    db = get_db()
    doc = await db.reports.find_one({"_id": ObjectId(report_id)})
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    doc["locked"] = _is_locked(doc["created_at"])
    return doc