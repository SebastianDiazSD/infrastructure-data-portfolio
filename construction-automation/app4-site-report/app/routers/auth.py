# app/routers/auth.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from jose import JWTError

from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_access_token
from app.database import get_db
from app.limiter import limiter
from fastapi import Request as FastAPIRequest
from collections import defaultdict
from datetime import datetime, timezone, timedelta as _timedelta

# ── In-memory login lockout ──────────────────────────────────────────
# Resets on dyno restart — acceptable until Supabase migration
# where this moves to a failed_logins table.
_failed: dict[str, list[datetime]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_WINDOW = _timedelta(minutes=15)
_LOCKOUT = _timedelta(minutes=15)


def _check_lockout(email: str) -> None:
    now = datetime.now(timezone.utc)
    _failed[email] = [t for t in _failed[email] if now - t < _WINDOW]
    if len(_failed[email]) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Try again in 15 minutes."
        )


def _record_failure(email: str) -> None:
    _failed[email].append(datetime.now(timezone.utc))


def _clear_failures(email: str) -> None:
    _failed[email] = []

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


# ─── REGISTER ────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(user: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    doc = {
        "email": user.email,
        "hashed_password": hash_password(user.password),
        "full_name": user.full_name,
        "role": user.role,
        "default_project_name": user.default_project_name,
        "default_project_id": user.default_project_id,
        "language": user.language,
    }
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=doc["email"],
            full_name=doc["full_name"],
            role=doc["role"],
            default_project_name=doc["default_project_name"],
            default_project_id=doc["default_project_id"],
            language=doc["language"],
        )
    )


# ─── LOGIN ───────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(credentials: UserLogin, request: FastAPIRequest):
    _check_lockout(credentials.email)
    db = get_db()
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc["hashed_password"]):
        _record_failure(credentials.email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    _clear_failures(credentials.email)
    user_id = str(user_doc["_id"])
    token = create_access_token(user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            role=user_doc["role"],
            default_project_name=user_doc.get("default_project_name"),
            default_project_id=user_doc.get("default_project_id"),
            language=user_doc.get("language", "de"),
        )
    )


# ─── DEPENDENCY: get current user from Bearer token ─────────────────
async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserResponse:
    try:
        user_id = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        role=user_doc["role"],
        default_project_name=user_doc.get("default_project_name"),
        default_project_id=user_doc.get("default_project_id"),
        language=user_doc.get("language", "de"),
    )

# ─── GET /auth/me ────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user