from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import report, voice, parse
import os

app = FastAPI(
    title="Ground2Tech Site Inspection Report Generator",
    description="Generates Bautagesbericht reports from voice/text input using Claude AI",
    version="0.1.0",
)

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