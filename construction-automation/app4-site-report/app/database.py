#app/database.py

from motor.motor_asyncio import AsyncIOMotorClient
from os import environ
from typing import Optional

_client: Optional[AsyncIOMotorClient] = None

async def connect_to_mongo() -> None:
    global _client
    uri = environ.get("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGO_URI environment variable is not set")
    _client = AsyncIOMotorClient(uri)

    # Ping to verify connection on startup

    await _client.admin.command("ping")
    print("[DB] Connected to MongoDB Atlas")

async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()
        print("[DB] Closed connection to MongoDB Atlas")

def get_db():
    if _client is None:
        raise RuntimeError("Databse not connected. Call connect_to_mongo() first")
    return _client.g2t_app4
