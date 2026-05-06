# clause_patterns.py
# Country-specific clause detection patterns.
# To add a new country: add an entry to CLAUSE_CONFIGS.
# The rest of the app reads from ACTIVE_CONFIG only.
#
# ACTIVE_CONFIG selection priority:
#   1. CONTRACT_COUNTRY env var (for Render.com / production multi-tenant)
#   2. Hardcoded fallback below
#
# Set in Render environment: CONTRACT_COUNTRY=DE_VOB | US_AIA | CO_CCO

import os
import re

CLAUSE_CONFIGS = {
    "DE_VOB": {
        "pattern": r'(§\s*\d+[a-zA-Z]?)\s*[\s\n]+([^\n]{3,80})',
        "high_risk_clauses": ["§ 4", "§ 5", "§ 8", "§ 13", "§ 16"],
        "risk_signal_patterns": [
            r"Vertragsstrafe", r"Verzugszinsen", r"Schadensersatz",
            r"Kündigung", r"fruchtlos abgelaufen", r"angemessene\s+Frist",
            r"Verjährungsfrist", r"Sicherheitsleistung", r"einseitig",
            r"ohne\s+Abmahnung", r"Rücktritt", r"Bürgschaft auf Abruf",
        ],
        "density_anchor": r'§\s*\d+',
        "language": "de",
        "standard": "VOB/B",
    },
    "US_AIA": {
        "pattern": r'(Article\s+\d+)\s*[\s\n]+([^\n]{3,80})',
        "high_risk_clauses": ["Article 3", "Article 7", "Article 14"],
        "risk_signal_patterns": [
            r"liquidated damages", r"termination for convenience",
            r"termination for cause", r"indemnif",
            r"limitation of liability", r"force majeure",
            r"change order", r"claims", r"dispute resolution",
            r"consequential damages",
        ],
        "density_anchor": r'Article\s+\d+',
        "language": "en",
        "standard": "AIA A201",
    },
    "CO_CCO": {
        "pattern": r'(Cláusula\s+\d+[a-zA-Z]?)[:\s]*[\s\n]+([^\n]{3,80})',
        "high_risk_clauses": [],
        "risk_signal_patterns": [
            r"multa", r"cláusula penal", r"terminación unilateral",
            r"caducidad", r"indemnización", r"garantía",
            r"responsabilidad", r"liquidación unilateral",
        ],
        "density_anchor": r'Cláusula\s+\d+',
        "language": "es",
        "standard": "CCo",
    },
}

# ── Active config selection ────────────────────────────────────────────────────
_env_country = os.getenv("CONTRACT_COUNTRY", "DE_VOB")
ACTIVE_CONFIG = CLAUSE_CONFIGS.get(_env_country, CLAUSE_CONFIGS["DE_VOB"])

# ── Pre-compile risk signals per config ───────────────────────────────────────
_compiled_signals: dict = {}
for _key, _cfg in CLAUSE_CONFIGS.items():
    _compiled_signals[_key] = [
        re.compile(p, re.IGNORECASE)
        for p in _cfg.get("risk_signal_patterns", [])
    ]


def _signals_for(config: dict) -> list:
    for key, cfg in CLAUSE_CONFIGS.items():
        if cfg is config:
            return _compiled_signals.get(key, [])
    return []


# ── Core functions ────────────────────────────────────────────────────────────

def find_vob_b_start_by_density(full_text: str, config: dict = None) -> int:
    """
    Find where clause headers begin using sliding-window density detection.
    Works for all three configs — uses config's density_anchor, not hardcoded §.
    """
    if config is None:
        config = ACTIVE_CONFIG

    anchor = re.compile(config.get("density_anchor", r'§\s*\d+'), re.IGNORECASE)
    lines = full_text.split('\n')
    window_size = 30
    step = max(1, window_size // 2)

    best_offset = 0
    best_density = 0

    for i in range(0, len(lines), step):
        chunk = '\n'.join(lines[i:i + window_size])
        density = len(anchor.findall(chunk))
        if density > best_density:
            best_density = density
            best_offset = sum(len(lines[j]) + 1 for j in range(i))

    return best_offset


def extract_clauses(text: str, config: dict = None) -> list:
    """
    Extract numbered clauses from contract text.

    Uses the active config's pattern to find all headers, then slices body
    text between consecutive headers. Handles § / Article / Clausula equally.

    Returns list of dicts with keys:
        number, title, text (capped 2000 chars), page_start, has_risk_signals
    """
    if config is None:
        config = ACTIVE_CONFIG

    start_offset = find_vob_b_start_by_density(text, config)
    working_text = text[start_offset:]

    header_re = re.compile(config["pattern"], re.MULTILINE)
    matches = list(header_re.finditer(working_text))

    clauses = []
    for i, match in enumerate(matches):
        number = re.sub(r'\s+', ' ', match.group(1)).strip()
        title  = match.group(2).strip()

        body_start = match.end()
        body_end   = matches[i + 1].start() if (i + 1) < len(matches) else len(working_text)
        body       = working_text[body_start:body_end].strip()

        char_pos = start_offset + match.start()
        page_estimate = max(1, char_pos // 3000 + 1)

        # Skip TOC entries: body is dots/whitespace with no real content
        clean_body = body.strip().replace('.', '').replace(' ', '').replace('\n', '')
        if len(clean_body) < 50:
            continue

        clauses.append({
            "number": number,
            "title": title,
            "text": body[:2000],
            "page_start": page_estimate,
            "has_risk_signals": has_risk_signals(body, number, config),
        })

    return clauses


def has_risk_signals(clause_text: str, clause_number: str = "", config: dict = None) -> bool:
    """
    Return True if clause should be sent to Claude.

    Two independent checks:
      1. Structural: clause number is in the config's high_risk_clauses list
      2. Content:    clause text matches a risk signal pattern

    Either check alone is sufficient. Together they avoid ~40% of Claude calls
    on boilerplate clauses while catching risk language in unlisted clauses.
    """
    if config is None:
        config = ACTIVE_CONFIG

    for hr in config.get("high_risk_clauses", []):
        if hr.lower() in clause_number.lower():
            return True

    return any(p.search(clause_text) for p in _signals_for(config))