"""
main.py — Ground2Tech Contract Risk API

Mode A: POST /analyze-contract   — pre-signing VOB/B risk analysis
Mode B: POST /analyze-nachtrag   — Nachtrag review + Stellungnahme
        POST /export-report      — Mode A → DOCX
        POST /export-stellungnahme — Mode B → DOCX
        GET  /health

Security:
  - CORS: restricted to ALLOWED_ORIGINS env var (localhost:5173 dev, risk.ground2tech.com prod)
  - File size: 20 MB limit (FastAPI default is 1 MB, overridden via UPLOAD_MAX_MB)
  - File type validation: extension check on all uploads
  - In-memory cache: keyed by MD5 hash of file bytes (avoids re-analyzing same doc)
    Not a security concern because cache is process-local and non-persistent.

Rate limiting: V1 uses none (single-user assumption). Add slowapi in V2 before
public launch — 20 req/min per IP is appropriate for an LLM-backed endpoint.
"""

import os
import hashlib
import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from parser import extract_text, is_scanned_pdf, extract_nachtrag_data
from clause_patterns import extract_clauses
from gaeb_parser import is_gaeb_file, parse_gaeb_file
from risk_scorer import score_clauses, aggregate_risk_summary
from nachtrag_scorer import analyze_nachtrag
from exporter import export_risk_report_docx, export_stellungnahme_docx
from contract_qa import answer_question

# ── Config ────────────────────────────────────────────────────────────────────

_ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

_MAX_UPLOAD_BYTES = int(os.getenv("UPLOAD_MAX_MB", "20")) * 1024 * 1024

# ── In-memory cache ───────────────────────────────────────────────────────────
# Keyed by MD5(file_bytes). Survives within one Render dyno lifetime.
# Cleared on restart. Acceptable for V1 — no user accounts yet.
_cache: dict[str, dict] = {}
# Clause-only cache for Q&A — keyed by same MD5 as _cache
_clause_cache: dict[str, list] = {}


def _md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Ground2Tech Contract Risk API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _read_upload(file: UploadFile, label: str = "file") -> bytes:
    """Read upload and enforce size limit."""
    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds {_MAX_UPLOAD_BYTES // (1024*1024)} MB limit."
        )
    return content


def _require_ext(filename: str, allowed: tuple[str, ...], label: str):
    ext = os.path.splitext(filename.lower())[1]
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"{label}: unsupported format '{ext}'. Allowed: {allowed}"
        )
    return ext


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "mode_a": True, "mode_b": True}


# ── Mode A: Pre-signing VOB/B risk ────────────────────────────────────────────

@app.post("/analyze-contract")
async def analyze_contract(file: UploadFile = File(...)):
    """
    Accept a VOB/B contract PDF.
    Returns structured clause list with risk assessment.

    Response schema:
      {
        "clauses": [
          {
            "number": "§ 4",
            "title": "Ausführung der Leistung",
            "text": "...",
            "page_start": 3,
            "risk_level": "high|medium|low",
            "risk_category": "...",
            "reason": "...",
            "suggestion": "..."
          }
        ],
        "summary": {
          "overall_risk_score": 72,
          "overall_risk_level": "HIGH",
          "high_risk_count": 4,
          "medium_risk_count": 3,
          "top_3_risky_clauses": [...],
          "summary_text": "..."
        }
      }
    """
    _require_ext(file.filename, (".pdf",), "Contract file")
    content = await _read_upload(file, "Contract PDF")

    # Cache hit
    key = _md5(content)
    if key in _cache:
        return {**_cache[key], "session_id": key}

    # Parse
    text, page_count = extract_text(content)

    if is_scanned_pdf(text, page_count):
        raise HTTPException(
            status_code=422,
            detail=(
                "Scanned PDF detected — no usable text layer found. "
                "Please upload a searchable (digital/text-layer) PDF. "
                "OCR support is planned for V2."
            )
        )

    clauses = extract_clauses(text)
    if not clauses:
        raise HTTPException(
            status_code=422,
            detail=(
                "No §-numbered clauses found. "
                "Verify the document is a VOB/B-structured contract."
            )
        )

    # Score (parallel Claude calls)
    scored = await score_clauses(clauses)
    summary = aggregate_risk_summary(scored)

    result = {"clauses": scored, "summary": summary}
    _cache[key] = result
    _clause_cache[key] = scored  # for Q&A endpoint
    return {**result, "session_id": key}

# ── Mode A: Q&A over analyzed contract ───────────────────────────────────────

class QARequest(BaseModel):
    session_id: str
    question: str

@app.post("/ask-contract")
async def ask_contract(req: QARequest):
    """
    Free-text Q&A over a previously analyzed contract.
    session_id comes from /analyze-contract response.
    question is a plain-language question about the contract.
    """
    if not req.session_id or not req.question.strip():
        raise HTTPException(status_code=400, detail="session_id and question are required.")

    clauses = _clause_cache.get(req.session_id)
    if not clauses:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Upload and analyze the contract first."
        )

    if len(req.question) > 500:
        raise HTTPException(status_code=400, detail="Question too long. Max 500 characters.")

    return await answer_question(clauses, req.question)

# ── Mode B: Nachtrag review ───────────────────────────────────────────────────

@app.post("/analyze-nachtrag")
async def analyze_nachtrag_endpoint(
    nachtrag: UploadFile = File(...),
    original_lv: UploadFile = File(...),
):
    """
    Accept:
      - nachtrag:    contractor's Nachtrag claim (PDF)
      - original_lv: original LV (PDF or GAEB .x83/.x84)

    Returns:
      {
        "nachtrag_summary": {
          "total_claimed": 45000.0,
          "accepted_total": 12000.0,
          "contested_total": 33000.0,
          "recommendation": "negotiate",
          "position_count": 5
        },
        "positions": [
          {
            "oz": "01.002.0030",
            "nachtrag_description": "...",
            "nachtrag_claimed_total": 9000.0,
            "lv_oz": "01.002.0030",
            "lv_unit_price": 120.0,
            "assessment": "negotiate",
            "vob_paragraph": "§2 Abs. 3 VOB/B",
            "vob_reasoning": "...",
            "price_assessment": "overstated",
            "reason": "...",
            "negotiation_position": "..."
          }
        ],
        "stellungnahme": "Der Nachtrag wurde geprüft..."
      }
    """
    _require_ext(nachtrag.filename, (".pdf",), "Nachtrag")
    lv_ext = _require_ext(
        original_lv.filename,
        (".pdf", ".x83", ".x84", ".gaeb"),
        "Original LV"
    )

    nachtrag_bytes = await _read_upload(nachtrag, "Nachtrag PDF")
    lv_bytes = await _read_upload(original_lv, "Original LV")

    # Parse Nachtrag
    nachtrag_data = extract_nachtrag_data(nachtrag_bytes)

    # Parse LV
    lv_positions: list[dict] = []
    lv_pdf_bytes = None

    if lv_ext in (".x83", ".x84", ".gaeb"):
        try:
            lv_positions = parse_gaeb_file(lv_bytes)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"GAEB parsing failed: {exc}"
            )
    else:
        # PDF LV — nachtrag_scorer will extract positions via Claude
        lv_pdf_bytes = lv_bytes

    result = await analyze_nachtrag(nachtrag_data, lv_positions, lv_pdf_bytes)
    return result


# ── Export endpoints ──────────────────────────────────────────────────────────

@app.post("/export-report")
async def export_report(data: dict):
    """Export Mode A result as DOCX risk report."""
    try:
        buf = export_risk_report_docx(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {exc}")

    return StreamingResponse(
        io.BytesIO(buf),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="risk_report.docx"'},
    )


@app.post("/export-stellungnahme")
async def export_stellungnahme(data: dict):
    """Export Mode B result as DOCX Stellungnahme."""
    try:
        buf = export_stellungnahme_docx(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {exc}")

    return StreamingResponse(
        io.BytesIO(buf),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="stellungnahme.docx"'},
    )

# ── Static frontend (production) ──────────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")