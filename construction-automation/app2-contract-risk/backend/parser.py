"""
parser.py — PDF text extraction layer.

Mode A: extract_text() + clause_patterns functions handle VOB/B contracts.
Mode B: extract_nachtrag_data() handles contractor Nachtrag PDFs (unstructured).

Design decision — why PyMuPDF over alternatives:
  pdfplumber: good tables, slower, more memory overhead
  pypdf:      umlaut encoding issues with older German PDFs
  pdfminer:   verbose API, requires more boilerplate for simple extraction
  PyMuPDF:    fastest, smallest footprint, reliable umlaut handling via UTF-8 text layer

Scanned PDF detection: avg chars/page < 100 → no usable text layer.
V1 returns HTTP 422 with message. OCR via Tesseract deferred to V2.
"""

import re
from typing import Optional
import fitz  # PyMuPDF

from clause_patterns import extract_clauses, has_risk_signals  # noqa: F401 (re-exported)

# ── German decimal / price patterns for Nachtrag extraction ──────────────────
# German format: 1.234,56 EUR  or  1234,56 €  or  EUR 1.234,56
_GERMAN_DECIMAL = r'\d{1,3}(?:\.\d{3})*(?:,\d{2})?'
_PRICE_RE = re.compile(
    rf'({_GERMAN_DECIMAL})\s*(?:EUR|€|Euro)',
    re.IGNORECASE
)

# Position header patterns in Nachtrag:
# matches "01.001.0010", "Pos. 3", "Position 3.", "3."
_POS_HEADER_RE = re.compile(
    r'(?:'
    r'\d{1,2}\.\d{3}\.\d{4}'       # OZ full: 01.001.0010
    r'|\d{1,2}\.\d{1,3}(?![.\d]*,)'  # OZ partial — rejects currency (has comma downstream)
    r'|(?:Pos(?:ition)?\.?\s*)\d+' # Pos. N / Position N
    r'|\b\d+\.\s+'                 # Running number: "3. "
    r')',
    re.IGNORECASE
)

# Section markers for Begründung / justification
_BEGR_START = re.compile(
    r'(?:Begr[üu]ndung|Sachverhalt|Nachtragsbegr[üu]ndung|Sachdarstellung)',
    re.IGNORECASE
)
_BEGR_END = re.compile(
    r'(?:Positionen|Leistungsverzeichnis|Zusammenfassung|Nachtragspositionen|LV-Positionen)',
    re.IGNORECASE
)


# ── Mode A — VOB/B contract PDF ───────────────────────────────────────────────

def extract_text(pdf_bytes: bytes) -> tuple[str, int]:
    """
    Extract full text from a PDF. Returns (text, page_count).

    Uses PyMuPDF page.get_text("text") which preserves paragraph structure
    better than "blocks" mode for flowing German legal text.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n".join(pages), len(pages)


def is_scanned_pdf(text: str, page_count: int) -> bool:
    """
    Heuristic: if average chars per page < 100, assume scanned image PDF.

    100 chars/page is conservative — a single paragraph of German legal
    text is ~400–600 chars. A scanned page typically returns 0–15 chars
    (whitespace artefacts from the text layer).
    """
    if page_count == 0:
        return True
    return (len(text) / page_count) < 100


# ── Mode B — Nachtrag PDF ─────────────────────────────────────────────────────

def extract_nachtrag_data(pdf_bytes: bytes) -> dict:
    """
    Extract structured data from a contractor's Nachtrag PDF.

    Returns:
        full_text       str          full extracted text (for Claude fallback)
        begründung      str          justification section (if found)
        positions       list[dict]   regex-extracted positions (may be empty)
        total_claimed   float | None sum of all price figures found

    The positions list is best-effort. If len < 2, nachtrag_scorer.py
    will use the Claude extraction fallback (EXTRACT_PROMPT).
    """
    text, _ = extract_text(pdf_bytes)

    begründung = _extract_begründung(text)
    positions = _extract_positions_regex(text)
    if len(positions) < 2:
        positions = _extract_nt_lv_positions(text)
    total_claimed = _extract_total_claimed(text)

    return {
        "full_text": text,
        "begründung": begründung,
        "positions": positions,
        "total_claimed": total_claimed,
    }


def _extract_begründung(text: str) -> str:
    """
    Find the justification section between Begründung and the position table.
    Returns empty string if no clear marker found (caller uses full_text[:2000]).
    """
    start_match = _BEGR_START.search(text)
    if not start_match:
        return ""

    start = start_match.end()
    end_match = _BEGR_END.search(text, start)
    end = end_match.start() if end_match else start + 3000  # cap at 3000 chars

    return text[start:end].strip()


def _parse_german_float(s: str) -> Optional[float]:
    """
    Convert German decimal string to float.
    '1.234,56' → 1234.56   '1234,56' → 1234.56   '1234.56' → 1234.56
    """
    if not s:
        return None
    # If both . and , present: . is thousands separator, , is decimal
    if '.' in s and ',' in s:
        cleaned = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        cleaned = s.replace(',', '.')
    else:
        cleaned = s
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_positions_regex(text: str) -> list[dict]:
    """
    Best-effort regex extraction of Nachtrag positions.

    Looks for lines that contain:
      - a position identifier (OZ or running number)
      - a currency amount

    Returns a list of partially-filled position dicts.
    nachtrag_scorer.py will normalize/fill gaps via Claude if needed.
    """
    positions = []
    lines = text.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        pos_match = _POS_HEADER_RE.match(line)
        price_match = _PRICE_RE.search(line)

        if pos_match and price_match:
            oz_raw = pos_match.group(0).strip().rstrip('.')
            price_str = price_match.group(1)

            # Try to grab description from same line after position header
            desc_start = pos_match.end()
            desc_before_price = line[desc_start:price_match.start()].strip()

            # If description is too short, peek at next line
            if len(desc_before_price) < 10 and i + 1 < len(lines):
                desc_before_price = lines[i + 1].strip()

            price = _parse_german_float(price_str)

            positions.append({
                "oz": oz_raw,
                "description": desc_before_price[:200],
                "qty": None,           # often not on same line
                "unit": None,
                "claimed_unit_price": None,
                "claimed_total": price,
            })

        i += 1

    return positions

_NT_LV_OZ_RE = re.compile(r'^(\d{2}\.\d+\.\d+)\.\s*$', re.MULTILINE)


def _extract_nt_lv_positions(text: str) -> list[dict]:
    """
    Extract positions from NT-LV format (Zulage structure).
    OZ is on its own line, prices follow in fixed order at end of block.
    Handles NT100-style documents with 100+ positions without LLM.
    """
    lines = text.split('\n')
    oz_indices = []
    for i, line in enumerate(lines):
        m = _NT_LV_OZ_RE.match(line.strip())
        if m:
            oz_indices.append((i, m.group(1)))

    if len(oz_indices) < 2:
        return []

    positions = []
    for idx, (line_i, oz) in enumerate(oz_indices):
        end_line = oz_indices[idx + 1][0] if idx + 1 < len(oz_indices) else len(lines)
        segment = lines[line_i:end_line]

        # Title = first non-empty line after OZ
        title = ""
        for line in segment[1:4]:
            if line.strip():
                title = line.strip()
                break

        # Prices are the last 3 numeric-ish lines before the next OZ
        # Pattern from end: total / unit_price / qty+unit
        numeric_lines = []
        for line in reversed(segment):
            s = line.strip()
            if re.match(r'^[\d.,]+(\s+[a-zA-Zäöüm²³/]+)?\s*$', s) and s:
                numeric_lines.append(s)
            if len(numeric_lines) == 3:
                break

        total, up, qty, unit = None, None, None, None
        if len(numeric_lines) >= 2:
            total = _parse_german_float(numeric_lines[0].split()[0])
            up = _parse_german_float(numeric_lines[1].split()[0])
        if len(numeric_lines) >= 3:
            parts = numeric_lines[2].split()
            qty = _parse_german_float(parts[0])
            unit = parts[1] if len(parts) > 1 else None

        if total is not None:
            positions.append({
                "oz": oz,
                "description": title,
                "qty": qty,
                "unit": unit,
                "claimed_unit_price": up,
                "claimed_total": total,
            })

    return positions

def _extract_total_claimed(text: str) -> Optional[float]:
    """
    Find the total Nachtrag claim (Gesamtbetrag / Nachtragssumme).

    Looks for the last large currency figure preceded by a total-indicator keyword.
    """
    total_pattern = re.compile(
        rf'(?:Gesamt(?:betrag|summe|forderung|nachtrag)|Nachtragssumme|Summe)\D{{0,30}}'
        rf'({_GERMAN_DECIMAL})\s*(?:EUR|€|Euro)',
        re.IGNORECASE
    )
    matches = list(total_pattern.finditer(text))
    if matches:
        return _parse_german_float(matches[-1].group(1))

    # Fallback: largest single price found in document
    all_prices = [_parse_german_float(m.group(1)) for m in _PRICE_RE.finditer(text)]
    all_prices = [p for p in all_prices if p is not None]
    return max(all_prices) if all_prices else None