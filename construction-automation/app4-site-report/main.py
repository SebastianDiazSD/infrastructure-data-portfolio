from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import report, voice, parse
from contextlib import asynccontextmanager
from app.database import init_supabase
from app.routers.auth import router as auth_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
import os
from fastapi import Response

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_supabase()
    yield

app=FastAPI(title="G2T Site Reporter API",lifespan=lifespan)

_allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Report generation
app.include_router(report.router, prefix="/api")

# Voice transcription (Whisper)
app.include_router(voice.router, prefix="/api")

# Mode B: free-text / voice → structured parse
app.include_router(parse.router, prefix="/api")

# User authentication
app.include_router(auth_router)

@app.head("/")
async def head_root():
    return Response(status_code=200)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Ground2Tech Report Generator"}


# Serve React frontend — must be LAST
DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))