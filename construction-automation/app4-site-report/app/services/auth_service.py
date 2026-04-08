# app/services/auth_service.py

import bcrypt
from jose import JWTError,jwt
from datetime import datetime, timedelta,timezone
from os import environ

SECRET_KEY = environ.get("JWT_SECRET","dev-only-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

def hash_password(password: str) -> str:
    salt=bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"),salt).decode("utf-8")

def verify_password(plain:str,hashed:str)->bool:
    return bcrypt.checkpw(plain.encode("utf-8"),hashed.encode("utf-8"))

def create_access_token(user_id:str)->str:
    expire=datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub":user_id,"exp":expire}
    return jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)

def decode_access_token(token:str)->str:
    """Returns user_id. Raises JWTError on invalid/expired token"""
    payload = jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
    user_id:str=payload.get("sub")
    if user_id is None:
        raise JWTError("Token payload missing 'sub'")
    return user_id