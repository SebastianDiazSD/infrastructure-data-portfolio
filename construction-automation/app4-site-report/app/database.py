#app/database.py

from motor.motor_asyncio import AsyncIOMotorClient
from os import environ
from typing import Optional

_client: Optional[AsyncIOMotorClient] = None

async def connect_to_mongo() -> None:
    global _client
    uri = environ.get("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set")
    _client = AsyncIOMotorClient(
        uri,
        serverSelectionTimeoutMS=5000,  # 5s max wait
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
    )
    # Connect lazily on first use
    print("[DB] MongoDB client initialised (lazy connection)")

async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()
        print("[DB] Closed connection to MongoDB Atlas")

def get_db():
    if _client is None:
        raise RuntimeError("Databse not connected. Call connect_to_mongo() first")
    return _client.g2t_app4
