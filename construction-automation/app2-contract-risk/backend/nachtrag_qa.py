"""
nachtrag_qa.py — Free-text Q&A for Mode B Path C (informal Nachtrag cases).

Handles three question types:
  1. Scope check:    "Ist Leistung X im Originalvertrag enthalten?"
  2. Justification:  "Ist diese Zusatzleistung nach VOB/B §2 berechtigt?"
  3. Free legal:     "Was bedeutet §2 Abs. 6 für diesen Fall?"

Context sources (all optional, keyed by label):
  nachtrag_text       extracted from uploaded informal doc or pasted text
  lv_text             extracted from uploaded original LV
  baubeschreibung_text extracted from uploaded Baubeschreibung

Without lv_text or baubeschreibung_text, answers are VOB/B-principles only.
This limitation is surfaced in the response confidence field.
"""

import os
import re
import json
import asyncio
from anthropic import AsyncAnthropic

_MODEL = "claude-haiku-4-5-20251001"

_SYSTEM = (
    "Du bist ein Baurechts-Sachverständiger auf Auftraggeber-Seite (Bauüberwacher/Projektsteuerer). "
    "Expertise: VOB/B §2, NEuPP, DB InfraGO Vertragsrecht. "
    "Du beantwortest konkrete Fragen zur Prüfung eines Nachtrags oder einer Anzeige "
    "einer Vertragsabweichung. Sei präzise, sachlich und handlungsorientiert. "
    "Antworte ausschließlich mit validem JSON — kein Markdown außerhalb des JSON. "
    "Kein ```json Block. Nur reines JSON-Objekt ohne Umrahmung."
)

_PROMPT = """\
VERTRAGSGRUNDLAGEN UND UNTERLAGEN:

{context_block}

FRAGE DES BAUÜBERWACHERS:
{question}

Beantworte die Frage auf Basis der obigen Unterlagen und VOB/B.
Falls relevante Unterlagen fehlen (z.B. kein Original-LV), weise darauf hin.

Antworte mit exakt diesem JSON:
{{
  "answer": "Direkte Antwort (max. 200 Wörter, konkret und handlungsorientiert)",
  "legal_basis": "VOB/B §X Abs. Y oder 'Nicht explizit aus den Unterlagen ableitbar'",
  "risk_flag": "high|medium|low|none",
  "action_required": "Konkrete nächste Handlung oder 'Keine sofortige Maßnahme erforderlich'",
  "confidence": "high|medium|low",
  "confidence_note": "Begründung: z.B. 'LV nicht vorhanden — nur VOB/B-Grundsätze anwendbar'",
  "missing_context": "Was für eine vollständigere Antwort fehlt, oder null"
}}"""

_SUGGESTED_QUESTIONS = [
    "Ist diese Leistung im Originalvertrag enthalten?",
    "Ist die Zusatzleistung nach VOB/B §2 grundsätzlich berechtigt?",
    "Was würde passieren, wenn diese Leistung nicht ausgeführt wird?",
    "Gefährdet diese Zusatzleistung unseren Fertigstellungstermin?",
    "Welche Unterlagen müssen wir vom AN noch einfordern?",
]


def _build_context_block(context: dict) -> str:
    """Build context string from available sources."""
    parts = []
    label_map = {
        "nachtrag_text": "NACHTRAG / ANZEIGE (vom AN eingereicht)",
        "lv_text": "ORIGINAL-LEISTUNGSVERZEICHNIS",
        "baubeschreibung_text": "BAUBESCHREIBUNG",
    }
    for key, label in label_map.items():
        if key in context and context[key]:
            parts.append(f"--- {label} ---\n{context[key][:3000]}")

    if not parts:
        parts.append("Keine Unterlagen hochgeladen. Antwort basiert ausschließlich auf VOB/B-Grundsätzen.")

    return "\n\n".join(parts)


async def answer_nachtrag_question(context: dict, question: str) -> dict:
    """
    Main entry point. Takes session context dict and a free-text question.
    Returns structured JSON answer.
    """
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set.")

    client = AsyncAnthropic(api_key=key)
    context_block = _build_context_block(context)
    prompt = _PROMPT.format(context_block=context_block, question=question)

    response = await client.messages.create(
        model=_MODEL,
        max_tokens=1200,
        system=_SYSTEM,
        messages=[
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": "{"},
        ],
    )

    raw = "{" + response.content[0].text.strip()
    clean = raw
    if clean.startswith("```"):
        parts = clean.split("```")
        inner = parts[1]
        if inner.startswith("json"):
            inner = inner[4:]
        clean = inner.strip()

    try:
        result = json.loads(clean)
        for k in ("answer", "legal_basis", "risk_flag", "action_required", "confidence"):
            if k not in result:
                raise KeyError(k)
    except (json.JSONDecodeError, KeyError):
        result = {
            "answer": raw[:400],
            "legal_basis": "Nicht ermittelbar",
            "risk_flag": "medium",
            "action_required": "Manuelle Prüfung erforderlich",
            "confidence": "low",
            "confidence_note": "Automatische Analyse fehlgeschlagen",
            "missing_context": None,
        }

    result["question"] = question
    result["suggested_questions"] = _SUGGESTED_QUESTIONS
    return result