"""
risk_scorer.py — Claude haiku-4-5 risk assessment for Mode A (pre-signing VOB/B).

Pipeline:
  clauses (list[dict]) →
  pre-filter with has_risk_signals() →
  asyncio.gather() parallel Claude calls (max 10 concurrent) →
  aggregate_risk_summary()

Token optimization: clauses with no risk signals (boilerplate) get
auto-assigned risk_level="low" without an API call. On a typical 20-clause
VOB/B contract, this saves ~40% of API calls.

Model: claude-haiku-4-5-20251001
  Chosen over claude-sonnet: speed + cost matter here; we may call it
  20× per document. Haiku handles German legal clause analysis well enough
  for the pass/fail nature of this assessment. User can escalate to Sonnet
  in V2 for flagged high-risk clauses.
"""

import os
import json
import asyncio
from anthropic import AsyncAnthropic
from clause_patterns import has_risk_signals  # noqa: used for pre-filter gate

def _get_client() -> AsyncAnthropic:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable not set. "
            "Export it before starting the server."
        )
    return AsyncAnthropic(api_key=key)

_client: AsyncAnthropic | None = None

_MODEL = "claude-haiku-4-5-20251001"

# ── Language-aware prompts ────────────────────────────────────────────────────
# Keyed by clause_patterns.ACTIVE_CONFIG["language"]: "de" | "en" | "es"

_SYSTEM_BY_LANG = {
    "de": (
        "Du bist ein erfahrener Rechtsanwalt mit Spezialisierung auf VOB/B "
        "und deutsches Bauvertragsrecht. Du analysierst Vertragsklauseln "
        "ausschließlich aus Sicht des Auftragnehmers (Bauunternehmen). "
        "Antworte ausschließlich mit validem JSON — kein Markdown, "
        "keine Erläuterungen außerhalb des JSON-Objekts."
    ),
    "en": (
        "You are an experienced construction attorney specializing in AIA contracts "
        "and US construction law. You analyze contract clauses exclusively from the "
        "contractor's perspective. Respond only with valid JSON — no markdown, "
        "no explanation outside the JSON object."
    ),
    "es": (
        "Eres un abogado especializado en contratos de construcción bajo el "
        "Código de Comercio colombiano y la Ley 80 de 1993. Analizas cláusulas "
        "exclusivamente desde la perspectiva del contratista. "
        "Responde únicamente con JSON válido — sin markdown ni texto fuera del objeto JSON."
    ),
}

_PROMPT_BY_LANG = {
    "de": """\
Vertragsklausel {number}: {title}

{text}

Bewerte das Risiko für den Auftragnehmer gemäß {standard}.

Antworte mit exakt diesem JSON-Objekt:
{{
  "risk_level": "high|medium|low",
  "risk_category": "payment|liability|termination|warranty|delay|scope|security|other",
  "reason": "Sachliche Begründung auf Deutsch. Max. 100 Wörter.",
  "suggestion": "Konkrete Handlungsempfehlung auf Deutsch. Max. 80 Wörter."
}}""",
    "en": """\
Contract clause {number}: {title}

{text}

Assess the risk for the contractor under {standard}.

Respond with exactly this JSON object:
{{
  "risk_level": "high|medium|low",
  "risk_category": "payment|liability|termination|warranty|delay|scope|security|other",
  "reason": "Factual assessment in English. Max 100 words.",
  "suggestion": "Concrete recommendation for the contractor. Max 80 words."
}}""",
    "es": """\
Cláusula {number}: {title}

{text}

Evalúa el riesgo para el contratista bajo {standard}.

Responde con exactamente este objeto JSON:
{{
  "risk_level": "high|medium|low",
  "risk_category": "payment|liability|termination|warranty|delay|scope|security|other",
  "reason": "Evaluación objetiva en español. Máx. 100 palabras.",
  "suggestion": "Recomendación concreta para el contratista. Máx. 80 palabras."
}}""",
}

_LOW_RISK_DEFAULT = {
    "risk_level": "low",
    "risk_category": "other",
    "reason": "Keine risikorelevanten Schlüsselwörter in dieser Klausel gefunden.",
    "suggestion": "Keine besonderen Maßnahmen erforderlich.",
}


# ── Single clause scoring ─────────────────────────────────────────────────────

async def _score_one(clause: dict) -> dict:
    """
    Score a single clause. Returns the original dict merged with risk fields.

    Pre-filter: clauses without risk signals get _LOW_RISK_DEFAULT without
    an API call. Saves ~40% tokens on a typical 20-clause contract.
    """
    global _client
    if _client is None:
        _client = _get_client()

    if not clause.get("has_risk_signals", False):
        return {**clause, **_LOW_RISK_DEFAULT}

    from clause_patterns import ACTIVE_CONFIG
    lang     = ACTIVE_CONFIG.get("language", "de")
    standard = ACTIVE_CONFIG.get("standard", "VOB/B")

    system = _SYSTEM_BY_LANG.get(lang, _SYSTEM_BY_LANG["de"])
    prompt = _PROMPT_BY_LANG.get(lang, _PROMPT_BY_LANG["de"]).format(
        number=clause["number"],
        title=clause["title"],
        text=clause["text"][:1500],
        standard=standard,
    )

    import anthropic as _anthropic
    for attempt in range(3):
        try:
            response = await _client.messages.create(
                model=_MODEL,
                max_tokens=400,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            break
        except _anthropic.RateLimitError:
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt + 1)  # 2s, 3s

    raw = response.content[0].text.strip()

    # Claude occasionally wraps JSON in ```json ... ``` fences — strip them
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
        clean = clean.strip()

    try:
        scoring = json.loads(clean)
        # Validate required keys exist — Claude occasionally drops one
        for key in ("risk_level", "risk_category", "reason", "suggestion"):
            if key not in scoring:
                raise KeyError(key)
        # Strip nested fences Claude occasionally puts inside string fields
        for field in ("reason", "suggestion"):
            val = scoring[field]
            if isinstance(val, str) and val.strip().startswith("```"):
                parts = val.strip().split("```")
                inner = parts[1]
                if "\n" in inner:
                    inner = inner[inner.index("\n") + 1:]
                inner = inner.strip()
                try:
                    inner_json = json.loads(inner)
                    scoring[field] = inner_json.get(field, inner)
                except json.JSONDecodeError:
                    scoring[field] = inner
    except (json.JSONDecodeError, KeyError):
        # Malformed response: mark medium, include raw for debugging
        scoring = {
            "risk_level": "medium",
            "risk_category": "other",
            "reason": raw[:300],
            "suggestion": "Manuelle Überprüfung empfohlen — automatische Analyse unvollständig.",
        }

    return {**clause, **scoring}


# ── Parallel scoring ──────────────────────────────────────────────────────────

async def score_clauses(clauses: list[dict]) -> list[dict]:
    """
    Score all clauses in parallel with a concurrency cap.

    Max 10 concurrent Claude calls: avoids rate-limit errors while keeping
    latency low on typical 15–25 clause contracts (~3–5s total).
    """
    semaphore = asyncio.Semaphore(3)

    async def bounded(c: dict) -> dict:
        async with semaphore:
            return await _score_one(c)

    return list(await asyncio.gather(*[bounded(c) for c in clauses]))


# ── Aggregate summary ─────────────────────────────────────────────────────────

def aggregate_risk_summary(scored: list[dict]) -> dict:
    """
    Compute overall risk score and summary metadata.

    Scoring formula:
      weight(high)=3, weight(medium)=1, weight(low)=0
      score = 100 × Σ(weights) / (3 × clause_count)

    Threshold:
      score ≥ 60 → HIGH
      score ≥ 30 → MEDIUM
      else       → LOW

    These thresholds were set conservatively: a contract with even 1/3 of
    clauses high-risk should show HIGH overall.
    """
    _w = {"high": 3, "medium": 1, "low": 0}

    total_weight = sum(_w.get(c.get("risk_level", "low"), 0) for c in scored)
    max_weight = 3 * len(scored) if scored else 1
    score = round(100 * total_weight / max_weight)

    high_clauses = [c for c in scored if c.get("risk_level") == "high"]
    med_clauses  = [c for c in scored if c.get("risk_level") == "medium"]

    if score >= 60:
        overall_level = "HIGH"
    elif score >= 30:
        overall_level = "MEDIUM"
    else:
        overall_level = "LOW"

    top3 = sorted(high_clauses, key=lambda c: c.get("number", ""))[:3]

    return {
        "overall_risk_score": score,
        "overall_risk_level": overall_level,
        "high_risk_count": len(high_clauses),
        "medium_risk_count": len(med_clauses),
        "low_risk_count": len(scored) - len(high_clauses) - len(med_clauses),
        "top_3_risky_clauses": [
            {
                "number": c["number"],
                "title": c["title"],
                "reason": c.get("reason", ""),
            }
            for c in top3
        ],
        "summary_text": (
            f"{len(high_clauses)} Klausel(n) mit hohem Risiko, "
            f"{len(med_clauses)} mit mittlerem Risiko. "
            f"Gesamtrisiko: {overall_level} ({score}/100)."
        ),
    }