from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import report,voice

app = FastAPI(
    title="Ground2Tech Site Inspection Report Generator",
    description="Generates Bautagesbericht reports from voice/text input using Claude AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Report production
app.include_router(report.router, prefix="/api")

# Voice input
app.include_router(voice.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Ground2Tech Report Generator"}
