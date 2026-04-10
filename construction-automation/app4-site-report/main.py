from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import report, voice, parse
from contextlib import asynccontextmanager
from app.database import connect_to_mongo,close_mongo_connection
from app.routers.auth import router as auth_router
import os
from fastapi import Response

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app=FastAPI(title="G2T Site Reporter API",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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