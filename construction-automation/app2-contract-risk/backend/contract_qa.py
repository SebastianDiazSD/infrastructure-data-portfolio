"""
contract_qa.py — Free-text Q&A over an analyzed contract (Mode A session).

Architecture:
  No vector DB. Contracts are 20–50 clauses × 2000 chars ≈ 100k chars max.
  This fits in a single Claude context window. "Retrieval" is keyword overlap
  scoring — fast, zero dependencies, no embedding cost.

  User question → extract keywords → score clauses by overlap →
  top-5 clauses as context → Claude answers with structured JSON.

Supported question types (from field experience):
  - Scope: "Ist die Leistung im LV enthalten?"
  - Deadlines: "Welche Fristen gelten für Nachtragsangebote?"
  - Subcontracting: "Kann die Leistung an einen Dritten vergeben werden?"
  - Documentation: "Sind alle Nachweise gemäß NEuPP erforderlich?"
  - Authorization: "Wer ist berechtigt, Änderungen anzuordnen?"
"""

import os
import re
import json
import asyncio
from anthropic import AsyncAnthropic

_MODEL = "claude-haiku-4-5-20251001"

_STOPWORDS_DE = {
    "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen",
    "einem", "eines", "und", "oder", "aber", "ist", "sind", "wird",
    "werden", "hat", "haben", "für", "mit", "von", "zu", "an", "auf",
    "im", "in", "bei", "nach", "aus", "durch", "über", "unter", "wie",
    "was", "wer", "wo", "wenn", "ob", "dass", "nicht", "kann", "muss",
    "soll", "darf", "alle", "auch", "noch", "nur", "sich", "dieser",
    "diese", "dieses", "welche", "welcher", "welches",
}

_SYSTEM = (
    "Du bist ein erfahrener Baujurist und Bauüberwacher mit Spezialisierung "
    "auf VOB/B, DB InfraGO Vertragsrecht und NEuPP. Du beantwortest konkrete "
    "Fragen eines Bauüberwachers zu einem vorliegenden Vertrag. "
    "Antworte ausschließlich mit validem JSON — kein Markdown außerhalb des JSON."
)

_PROMPT_TEMPLATE = """\
Vertragskontext (relevante Klauseln):
{context}

Frage des Bauüberwachers:
{question}

Beantworte die Frage ausschließlich auf Basis der obigen Vertragsklauseln.
Wenn die Antwort nicht aus dem Vertrag ableitbar ist, erkläre was fehlt.

Antworte mit exakt diesem JSON:
{{
  "answer": "Direkte Antwort auf die Frage. Max. 150 Wörter. Konkret und handlungsorientiert.",
  "relevant_clauses": ["§ X", "§ Y"],
  "legal_basis": "VOB/B §X Abs. Y oder 'Nicht explizit geregelt'",
  "risk_flag": "high|medium|low|none",
  "action_required": "Konkrete nächste Handlung oder 'Keine sofortige Maßnahme erforderlich'",
  "confidence": "high|medium|low",
  "confidence_note": "Kurze Erklärung warum high/medium/low — z.B. 'Klausel §16.1.15 regelt dies explizit' oder 'Nicht im Vertrag erwähnt, VOB/B-Standard gilt'"
}}"""


def _extract_keywords(question: str) -> set[str]:
    """Extract meaningful tokens from question for clause matching."""
    tokens = re.findall(r'\b\w{3,}\b', question.lower())
    return {t for t in tokens if t not in _STOPWORDS_DE}


def _score_clause(clause: dict, keywords: set[str]) -> int:
    """
    Score a clause by keyword overlap with the question.
    Weights: title match = 3, number match = 5, text match = 1 per keyword.
    """
    score = 0
    text_lower = clause.get("text", "").lower()
    title_lower = clause.get("title", "").lower()
    number_lower = clause.get("number", "").lower()

    for kw in keywords:
        if kw in text_lower:
            score += 1
        if kw in title_lower:
            score += 3
        if kw in number_lower:
            score += 5
    return score


def retrieve_relevant_clauses(clauses: list[dict], question: str, top_n: int = 5) -> list[dict]:
    """
    Return top-N clauses most relevant to the question.
    Always includes all HIGH risk clauses (capped at 3) regardless of score —
    they're likely relevant to any serious question about the contract.
    """
    keywords = _extract_keywords(question)
    scored = sorted(clauses, key=lambda c: _score_clause(c, keywords), reverse=True)

    top = scored[:top_n]

    # Always include HIGH risk clauses not already in top
    high_risk = [c for c in clauses if c.get("risk_level") == "high" and c not in top]
    for c in high_risk[:3]:
        if c not in top:
            top.append(c)

    return top[:top_n + 3]  # cap total context


def _build_context(clauses: list[dict]) -> str:
    parts = []
    for c in clauses:
        parts.append(
            f"[{c['number']} — {c['title']}]\n"
            f"Risiko: {c.get('risk_level', 'unbekannt')}\n"
            f"{c['text'][:800]}"
        )
    return "\n\n---\n\n".join(parts)


async def answer_question(clauses: list[dict], question: str) -> dict:
    """
    Main entry point. Takes the full clause list from the session cache
    and a free-text question. Returns structured JSON answer.
    """
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set.")

    client = AsyncAnthropic(api_key=key)
    relevant = retrieve_relevant_clauses(clauses, question)
    context = _build_context(relevant)

    prompt = _PROMPT_TEMPLATE.format(context=context, question=question)

    response = await client.messages.create(
        model=_MODEL,
        max_tokens=600,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    clean = raw
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
        clean = clean.strip()

    try:
        result = json.loads(clean)
        for key in ("answer", "relevant_clauses", "legal_basis", "risk_flag",
                    "action_required", "confidence"):
            if key not in result:
                raise KeyError(key)
    except (json.JSONDecodeError, KeyError):
        result = {
            "answer": raw[:400],
            "relevant_clauses": [],
            "legal_basis": "Nicht ermittelbar",
            "risk_flag": "medium",
            "action_required": "Manuelle Prüfung erforderlich",
            "confidence": "low",
            "confidence_note": "Automatische Analyse fehlgeschlagen",
        }

    result["question"] = question
    result["clauses_consulted"] = [
        f"{c['number']} {c['title']}" for c in relevant
    ]
    return result