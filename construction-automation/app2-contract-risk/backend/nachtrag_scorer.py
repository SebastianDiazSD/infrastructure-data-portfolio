"""
nachtrag_scorer.py — Claude haiku-4-5 Nachtrag assessment for Mode B.

Pipeline:
  nachtrag_text (str) + lv_positions (list[dict]) →
  [Step 1] Extract structured positions from Nachtrag text (regex → Claude fallback)
  [Step 2] If LV is PDF (not GAEB), extract LV positions via Claude
  [Step 3] Match Nachtrag positions to LV positions (OZ exact → text similarity)
  [Step 4] Score each matched position in parallel (Claude)
  [Step 5] Aggregate: totals, recommendation
  [Step 6] Generate Stellungnahme (one Claude call)
  → NachtragResult dict

§2 VOB/B classification is handled by Claude in the position prompt.
We provide the justification context so Claude can distinguish:
  §2 Abs. 3  — quantity deviation >10% on existing position
  §2 Abs. 5  — ordered scope change (AN Beauftragung)
  §2 Abs. 6  — necessary but not ordered (AN may claim, but proof required)
  §2 Abs. 8  — work without order (no entitlement by default)

Position matching strategy:
  1. OZ exact match (most reliable — same position number)
  2. Text similarity via difflib.SequenceMatcher (threshold 0.65)
  3. No match → classified as new position (§2 Abs. 6 / §2 Abs. 8 territory)
"""

import os
import json
import asyncio
from difflib import SequenceMatcher
from typing import Optional

from anthropic import AsyncAnthropic
from parser import extract_text  # needed for PDF LV fallback

def _get_client() -> AsyncAnthropic:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set.")
    return AsyncAnthropic(api_key=key)

_client: AsyncAnthropic | None = None
_MODEL = "claude-haiku-4-5-20251001"

# ── Language helpers ──────────────────────────────────────────────────────────
# Mode B (Nachtrag / change order review) is currently DE-primary because
# VOB/B §2 is the legal basis. US and CO equivalents use different legal
# frameworks (AIA §7 change orders; Ley 80 Art. 27 adjustments) — the
# language-aware stubs are here so the prompts can be extended per country
# without restructuring the pipeline.

_JSON_ONLY_BY_LANG = {
    "de": "Antworte ausschließlich mit validem JSON. Kein Markdown, keine Erläuterungen außerhalb des JSON.",
    "en": "Respond only with valid JSON. No markdown, no explanation outside the JSON object.",
    "es": "Responde únicamente con JSON válido. Sin markdown ni texto fuera del objeto JSON.",
}

_EXPERT_BY_LANG = {
    "de": "Du bist ein Baurechts-Sachverständiger auf Auftraggeber-Seite.",
    "en": "You are a construction law expert representing the owner.",
    "es": "Eres un experto en derecho de la construcción que representa al contratante.",
}

_LEGAL_REF_BY_LANG = {
    "de": "VOB/B §2",
    "en": "AIA A201 Article 7 / applicable contract change order provisions",
    "es": "Ley 80 de 1993 Art. 27 / cláusulas de ajuste del contrato",
}


def _lang() -> str:
    from clause_patterns import ACTIVE_CONFIG
    return ACTIVE_CONFIG.get("language", "de")


def _json_only() -> str:
    return _JSON_ONLY_BY_LANG.get(_lang(), _JSON_ONLY_BY_LANG["de"])


def _expert_system() -> str:
    return _EXPERT_BY_LANG.get(_lang(), _EXPERT_BY_LANG["de"])


def _legal_ref() -> str:
    return _LEGAL_REF_BY_LANG.get(_lang(), _LEGAL_REF_BY_LANG["de"])


# ── Step 1: Extract positions from Nachtrag text ──────────────────────────────

_EXTRACT_SYSTEM = "Du bist ein Baurechts-Sachverständiger. Antworte ausschließlich mit validem JSON. Kein Markdown, keine Erläuterungen außerhalb des JSON."

_EXTRACT_PROMPT = """\
Extrahiere aus diesem Nachtrag-Text alle Positionen und den Begründungstext.

TEXT:
{text}

JSON-Format (exakt):
{{
  "positions": [
    {{
      "oz": "OZ-Nummer oder null",
      "description": "Positionsbeschreibung",
      "qty": 0.0,
      "unit": "Einheit oder null",
      "claimed_unit_price": 0.0,
      "claimed_total": 0.0
    }}
  ],
  "begründung": "Begründungstext des Auftragnehmers",
  "total_claimed": 0.0
}}

Hinweise:
- OZ kann sein: "01.001.0010", "Pos. 3", "3", oder null
- Preise im deutschen Format (1.234,56) als Dezimalzahl (1234.56)
- total_claimed = Gesamtforderungsbetrag des Nachtrags
"""


async def _extract_nachtrag_positions_via_claude(text: str) -> dict:
    """Claude fallback: extract positions when regex yielded < 2 results."""
    global _client
    if _client is None:
        _client = _get_client()
    msg = await _client.messages.create(
        model=_MODEL,
        max_tokens=2000,
        system=_EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": _EXTRACT_PROMPT.format(text=text[:6000])}],
    )
    raw = msg.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"positions": [], "begründung": text[:2000], "total_claimed": None}


# ── Step 2: Extract LV positions from PDF (if not GAEB) ──────────────────────

_LV_EXTRACT_PROMPT = """\
Extrahiere alle Positionen aus diesem Leistungsverzeichnis (LV).

TEXT:
{text}

JSON-Format:
{{
  "positions": [
    {{
      "oz": "OZ-Nummer",
      "description": "Positionsbeschreibung",
      "qty": 0.0,
      "unit": "Einheit",
      "unit_price": 0.0,
      "total": 0.0
    }}
  ]
}}
"""


async def _extract_lv_from_pdf_text(lv_text: str) -> list[dict]:
    global _client
    if _client is None:
        _client = _get_client()
    msg = await _client.messages.create(
        model=_MODEL,
        max_tokens=3000,
        system=_EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": _LV_EXTRACT_PROMPT.format(text=lv_text[:8000])}],
    )
    raw = msg.content[0].text.strip()
    try:
        data = json.loads(raw)
        return data.get("positions", [])
    except json.JSONDecodeError:
        return []


# ── Step 3: Position matching ─────────────────────────────────────────────────

def _similarity(a: str, b: str) -> float:
    """Text similarity ratio using difflib (first 120 chars = enough for position IDs)."""
    return SequenceMatcher(None, a[:120].lower(), b[:120].lower()).ratio()


def _match_positions(nachtrag_positions: list[dict], lv_positions: list[dict]) -> list[dict]:
    """
    Match each Nachtrag position to an LV position.

    Returns list of match dicts:
        nachtrag     dict    Nachtrag position
        lv           dict|None   matched LV position (None = no match)
        match_type   str     "oz_exact" | "text_fuzzy" | "no_match"
        similarity   float   only for "text_fuzzy"
    """
    matches = []

    for np in nachtrag_positions:
        matched_lv = None
        match_type = "no_match"
        similarity = 0.0

        # Pass 1: exact OZ match
        if np.get("oz"):
            for lp in lv_positions:
                if lp.get("oz") and np["oz"].strip() == lp["oz"].strip():
                    matched_lv = lp
                    match_type = "oz_exact"
                    break

        # Pass 2: text similarity fallback
        if matched_lv is None and np.get("description"):
            best_ratio = 0.0
            for lp in lv_positions:
                ratio = _similarity(
                    np.get("description", ""),
                    lp.get("description", ""),
                )
                if ratio > best_ratio and ratio >= 0.65:
                    best_ratio = ratio
                    matched_lv = lp
                    match_type = "text_fuzzy"
                    similarity = ratio

        matches.append({
            "nachtrag": np,
            "lv": matched_lv,
            "match_type": match_type,
            "similarity": round(similarity, 3),
        })

    return matches


# ── Step 4: Score each matched position ──────────────────────────────────────

def _position_system() -> str:
    legal = _legal_ref()
    json_only = _json_only()
    expert = _expert_system()
    return f"{expert} Expertise in {legal}. {json_only}"

_POSITION_PROMPT = """\
Bewerte diese Nachtragsforderung (Auftragnehmer) aus Sicht des Auftraggebers.

ORIGINAL LV-POSITION:
OZ: {lv_oz}
Beschreibung: {lv_desc}
Menge: {lv_qty} {lv_unit}
Einheitspreis: {lv_up} EUR
Gesamtbetrag: {lv_total} EUR

NACHTRAG-FORDERUNG:
OZ: {n_oz}
Beschreibung: {n_desc}
Menge gefordert: {n_qty} {n_unit}
Einheitspreis (gefordert): {n_up} EUR
Gesamtbetrag (gefordert): {n_total} EUR
Mengenabweichung: {qty_delta_pct}%

BEGRÜNDUNG DES AUFTRAGNEHMERS:
{begruendung}

JSON:
{{
  "assessment": "accept|negotiate|reject",
  "vob_paragraph": "§2 Abs. X VOB/B",
  "vob_reasoning": "Kurze Begründung der Paragraph-Wahl (max. 60 Wörter)",
  "price_assessment": "justified|overstated|unjustified",
  "price_delta_percent": 0.0,
  "risk_level": "high|medium|low",
  "reason": "Sachliche Begründung der Bewertung (max. 150 Wörter)",
  "negotiation_position": "Empfohlene Verhandlungsposition des AG (max. 80 Wörter)"
}}"""

_NEW_POSITION_PROMPT = """\
Bewerte diese neue Nachtragsforderung ohne entsprechende LV-Position.

NACHTRAG-FORDERUNG:
OZ: {n_oz}
Beschreibung: {n_desc}
Menge: {n_qty} {n_unit}
Einheitspreis (gefordert): {n_up} EUR
Gesamtbetrag (gefordert): {n_total} EUR

BEGRÜNDUNG DES AUFTRAGNEHMERS:
{begruendung}

Prüfe insbesondere §2 Abs. 6 (notwendige Leistung ohne Auftrag) vs.
§2 Abs. 8 (eigenmächtige Leistung ohne Anspruch).

JSON:
{{
  "assessment": "accept|negotiate|reject",
  "vob_paragraph": "§2 Abs. X VOB/B",
  "vob_reasoning": "Kurze Begründung der Paragraph-Wahl (max. 60 Wörter)",
  "price_assessment": "justified|overstated|unjustified",
  "price_delta_percent": null,
  "risk_level": "high|medium|low",
  "reason": "Sachliche Begründung der Bewertung (max. 150 Wörter)",
  "negotiation_position": "Empfohlene Verhandlungsposition des AG (max. 80 Wörter)"
}}"""


def _safe_float(v) -> float:
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _qty_delta_pct(lp: dict, np_: dict) -> str:
    lv_qty = _safe_float(lp.get("qty"))
    n_qty  = _safe_float(np_.get("qty"))
    if lv_qty == 0:
        return "n/a"
    delta = 100 * (n_qty - lv_qty) / lv_qty
    return f"{delta:+.1f}"


async def _score_position(match: dict, begründung: str) -> dict:
    """Score one matched position pair. Returns flat result dict."""
    np_ = match["nachtrag"]
    lp  = match.get("lv")

    if lp:
        prompt = _POSITION_PROMPT.format(
            lv_oz=lp.get("oz", "n/a"),
            lv_desc=lp.get("description", "")[:300],
            lv_qty=lp.get("qty", "n/a"),
            lv_unit=lp.get("unit", ""),
            lv_up=lp.get("unit_price", "n/a"),
            lv_total=lp.get("total", "n/a"),
            n_oz=np_.get("oz", "n/a"),
            n_desc=np_.get("description", "")[:300],
            n_qty=np_.get("qty", "n/a"),
            n_unit=np_.get("unit", ""),
            n_up=np_.get("claimed_unit_price", "n/a"),
            n_total=np_.get("claimed_total", "n/a"),
            qty_delta_pct=_qty_delta_pct(lp, np_),
            begruendung=begründung[:800],
        )
    else:
        prompt = _NEW_POSITION_PROMPT.format(
            n_oz=np_.get("oz", "n/a"),
            n_desc=np_.get("description", "")[:300],
            n_qty=np_.get("qty", "n/a"),
            n_unit=np_.get("unit", ""),
            n_up=np_.get("claimed_unit_price", "n/a"),
            n_total=np_.get("claimed_total", "n/a"),
            begruendung=begründung[:800],
        )

    global _client
    if _client is None:
        _client = _get_client()
    msg = await _client.messages.create(
        model=_MODEL,
        max_tokens=500,
        system=_position_system(),
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()

    try:
        scoring = json.loads(raw)
        for k in ("assessment", "vob_paragraph", "reason"):
            if k not in scoring:
                raise KeyError(k)
    except (json.JSONDecodeError, KeyError):
        scoring = {
            "assessment": "negotiate",
            "vob_paragraph": "§2 VOB/B (unklar)",
            "vob_reasoning": "Automatische Analyse unvollständig.",
            "price_assessment": "overstated",
            "price_delta_percent": None,
            "risk_level": "medium",
            "reason": raw[:300],
            "negotiation_position": "Manuelle Überprüfung erforderlich.",
        }

    return {
        "oz": np_.get("oz"),
        "nachtrag_description": np_.get("description"),
        "nachtrag_qty": np_.get("qty"),
        "nachtrag_unit": np_.get("unit"),
        "nachtrag_claimed_unit_price": np_.get("claimed_unit_price"),
        "nachtrag_claimed_total": _safe_float(np_.get("claimed_total")),
        "lv_oz": lp.get("oz") if lp else None,
        "lv_description": lp.get("description") if lp else None,
        "lv_unit_price": lp.get("unit_price") if lp else None,
        "lv_total": lp.get("total") if lp else None,
        "match_type": match["match_type"],
        **scoring,
    }


# ── Step 5 + 6: Aggregate + Stellungnahme ────────────────────────────────────

_RESPONSE_LABEL = {
    "de": "Stellungnahme",
    "en": "formal response letter",
    "es": "respuesta formal",
}

def _stell_system() -> str:
    expert = _expert_system()
    lang = _lang()
    prose_instruction = {
        "de": "Erstelle einen formalen deutschen Geschäftstext. Kein Markdown. Reiner Fließtext.",
        "en": "Write a formal business letter in English. No markdown. Plain prose.",
        "es": "Redacta un texto formal en español. Sin markdown. Prosa continua.",
    }.get(lang, "Erstelle einen formalen deutschen Geschäftstext. Kein Markdown. Reiner Fließtext.")
    return f"{expert} {prose_instruction}"

_STELL_PROMPT = """\
Erstelle den Haupttext einer Stellungnahme zum Nachtrag (kein Briefkopf, kein Datum, kein Gruß).

Finanzdaten:
- Gesamtforderung des AN: {total_claimed} EUR
- Anerkannte Summe: {accepted_total} EUR
- Bestrittene Summe: {contested_total} EUR
- Gesamtempfehlung: {recommendation}

Positions-Bewertungen:
{positions_summary}

Anforderungen:
1. Einleitung: Nachtrag wurde geprüft, VOB/B §2 als Rechtsgrundlage
2. Je Position: kurze sachliche Bewertung (1–2 Sätze)
3. Schluss: klare Gegenposition (Anerkennung / Verhandlungsangebot / Ablehnung)
Stil: sachlich, rechtssicher, professionell, keine emotionale Wertung.
"""


def _positions_summary_text(scored: list[dict]) -> str:
    lines = []
    for i, p in enumerate(scored, 1):
        oz = p.get("oz") or p.get("lv_oz") or f"Pos. {i}"
        total = p.get("nachtrag_claimed_total", 0)
        assessment = p.get("assessment", "negotiate").upper()
        reason = p.get("reason", "")[:120]
        lines.append(f"- OZ {oz}: {assessment} | {total:,.2f} EUR | {reason}")
    return "\n".join(lines)


async def _generate_stellungnahme(
    scored: list[dict],
    total_claimed: float,
    accepted_total: float,
    contested_total: float,
    recommendation: str,
) -> str:
    prompt = _STELL_PROMPT.format(
        total_claimed=f"{total_claimed:,.2f}",
        accepted_total=f"{accepted_total:,.2f}",
        contested_total=f"{contested_total:,.2f}",
        recommendation=recommendation.upper(),
        positions_summary=_positions_summary_text(scored),
    )
    global _client
    if _client is None:
        _client = _get_client()
    msg = await _client.messages.create(
        model=_MODEL,
        max_tokens=1200,
        system=_stell_system(),
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()


# ── Public entry point ────────────────────────────────────────────────────────

async def analyze_nachtrag(
    nachtrag_data: dict,       # from parser.extract_nachtrag_data()
    lv_positions: list[dict],  # from gaeb_parser (may be [])
    lv_pdf_bytes: Optional[bytes] = None,  # if LV is PDF, not GAEB
) -> dict:
    """
    Full Mode B pipeline. Called by main.py /analyze-nachtrag endpoint.

    nachtrag_data keys: full_text, begründung, positions, total_claimed
    """
    # Step 1: get Nachtrag positions
    regex_positions = nachtrag_data.get("positions", [])
    begründung = nachtrag_data.get("begründung") or nachtrag_data.get("full_text", "")[:2000]
    total_claimed = nachtrag_data.get("total_claimed") or 0.0

    if len(regex_positions) < 2:
        # Regex found too little — Claude extraction fallback
        extracted = await _extract_nachtrag_positions_via_claude(nachtrag_data["full_text"])
        regex_positions = extracted.get("positions", [])
        begründung = extracted.get("begründung") or begründung
        if not total_claimed:
            total_claimed = extracted.get("total_claimed") or 0.0

    # Step 2: if LV is PDF, extract positions from it
    if lv_pdf_bytes and not lv_positions:
        lv_text, _ = extract_text(lv_pdf_bytes)
        lv_positions = await _extract_lv_from_pdf_text(lv_text)

    # Step 3: match positions
    matched = _match_positions(regex_positions, lv_positions)

    # Step 4: parallel position scoring
    semaphore = asyncio.Semaphore(10)

    async def bounded(m):
        async with semaphore:
            return await _score_position(m, begründung)

    scored = list(await asyncio.gather(*[bounded(m) for m in matched]))

    # Step 5: aggregate
    accepted_total = sum(
        _safe_float(p.get("nachtrag_claimed_total"))
        for p in scored if p.get("assessment") == "accept"
    )
    contested_total = sum(
        _safe_float(p.get("nachtrag_claimed_total"))
        for p in scored if p.get("assessment") in ("negotiate", "reject")
    )

    n = len(scored)
    reject_count  = sum(1 for p in scored if p.get("assessment") == "reject")
    accept_count  = sum(1 for p in scored if p.get("assessment") == "accept")

    if n == 0:
        recommendation = "negotiate"
    elif accept_count == n:
        recommendation = "accept"
    elif reject_count > n / 2:
        recommendation = "reject"
    else:
        recommendation = "negotiate"

    # Step 6: Stellungnahme
    stellungnahme = await _generate_stellungnahme(
        scored, total_claimed, accepted_total, contested_total, recommendation
    )

    return {
        "nachtrag_summary": {
            "total_claimed": total_claimed,
            "accepted_total": accepted_total,
            "contested_total": contested_total,
            "recommendation": recommendation,
            "position_count": n,
        },
        "positions": scored,
        "stellungnahme": stellungnahme,
    }