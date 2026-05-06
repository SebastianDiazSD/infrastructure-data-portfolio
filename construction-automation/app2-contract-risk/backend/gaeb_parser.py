"""
gaeb_parser.py — GAEB DA83/DA84 XML parser.

GAEB (Gemeinsamer Ausschuss Elektronik im Bauwesen) is the German standard
for electronic exchange of bill-of-quantities data in construction contracts.

Relevant exchange phases for App 2:
  DA80 / .x80  — Ausschreibung (RFQ)
  DA81 / .x81  — Angebotsaufforderung
  DA83 / .x83  — Zuschlag / Award (what we receive from iTWO)
  DA84 / .x84  — Abrechnungsgrundlage

All use the same core XML structure — only the root exchange code differs.
We handle both .x83 and .x84 (plus .gaeb as generic extension).

Design decision — why lxml over stdlib xml.etree:
  xml.etree does not support XPath on namespace-prefixed elements without
  explicit namespace registration. lxml's namespace-agnostic iteration
  (_strip_ns approach) is simpler and handles the two GAEB XML versions
  (2004 and 3.2 schemas) without branching.

Known limitation (V1):
  Hierarchical OZ reconstruction is approximate. GAEB BOQ trees can be
  deeply nested (Titel → Gruppe → Untergruppe → Position). We track the
  Itemno path from root to leaf. If the file uses a flat structure
  (as some iTWO exports do), OZ is taken directly from the OZ element.
"""

import os
from typing import Optional
from lxml import etree


# ── Public API ────────────────────────────────────────────────────────────────

def is_gaeb_file(filename: str) -> bool:
    """Return True if file extension indicates a GAEB file."""
    return os.path.splitext(filename.lower())[1] in (".x83", ".x84", ".gaeb")


def parse_gaeb_file(gaeb_bytes: bytes) -> list[dict]:
    """
    Parse a GAEB DA83/DA84 XML file.

    Returns a list of LV positions:
        oz           str          Ordnungszahl (e.g. "01.001.0010")
        description  str          position description text
        qty          float        Menge
        unit         str          Einheit (m, m², t, St, …)
        unit_price   float|None   Einheitspreis
        total        float|None   Gesamtbetrag (qty × unit_price)

    Raises ValueError if bytes are not valid XML.
    """
    try:
        root = etree.fromstring(gaeb_bytes)
    except etree.XMLSyntaxError as exc:
        raise ValueError(f"GAEB file is not valid XML: {exc}") from exc

    positions: list[dict] = []
    _walk(root, positions, path=[])
    return positions


# ── XML helpers ───────────────────────────────────────────────────────────────

def _tag(element) -> str:
    """Return the local tag name, stripping the namespace URI."""
    tag = element.tag
    return tag.split('}', 1)[1] if '}' in tag else tag


def _child_text(element, local_name: str) -> str:
    """Direct child text by local name. Returns '' if not found."""
    for child in element:
        if _tag(child) == local_name:
            return (child.text or "").strip()
    return ""


def _desc_text(element) -> str:
    """
    Extract visible description text from a Description element.

    GAEB Description can be:
      <Description><Text>...</Text></Description>
      <Description><OutlineText><OutlineTextPart><Text>...</Text>...

    We iterate all descendants and take the first non-empty Text element.
    """
    for desc_child in element.iter():
        if _tag(desc_child) == "Text" and desc_child.text and desc_child.text.strip():
            return desc_child.text.strip()
    return ""


def _parse_decimal(s: str) -> Optional[float]:
    """
    Parse GAEB decimal values.

    GAEB uses period as decimal separator (ISO) in modern versions.
    Older exports may use comma. We handle both.
    """
    if not s:
        return None
    s = s.strip()
    # If both separators present: period = thousands (EU style) or decimal (ISO)
    # GAEB standard mandates period as decimal separator — assume ISO.
    # Comma as decimal is legacy, handle by replacing comma→period.
    s_clean = s.replace(',', '.')
    try:
        return float(s_clean)
    except ValueError:
        return None


# ── BOQ tree walker ───────────────────────────────────────────────────────────

# Tags that represent a leaf position (has price/qty, not a section heading)
_LEAF_TAGS = {"BoQItem", "LotItem"}

# Tags that are pure structural containers (Titel, Gruppe)
_CONTAINER_TAGS = {"BoQBody", "BoQLevel", "Itemlist", "Award", "BOQ", "GAEB",
                   "GAEBInfo", "DP", "ClientAdd"}


def _walk(element, positions: list, path: list[str]) -> None:
    """
    Recursively walk the GAEB BOQ tree.

    path tracks Itemno values from root to current node, used to reconstruct OZ.
    Only nodes with a Qty child are true positions — headings have no Qty.
    """
    local = _tag(element)

    # Collect Itemno for path tracking (used by both headings and positions)
    itemno = _child_text(element, "Itemno") or _child_text(element, "OZ")

    # Determine if this node has actual position data
    qty_str = ""
    unit_price_str = ""
    total_str = ""
    unit_str = ""
    desc = ""

    # Position data may be directly on element or inside a child <Item> element
    item_element = element
    for child in element:
        if _tag(child) == "Item":
            item_element = child
            break

    qty_str = _child_text(item_element, "Qty")
    unit_str = _child_text(item_element, "QU")
    unit_price_str = _child_text(item_element, "UP")
    total_str = (
        _child_text(item_element, "T") or
        _child_text(item_element, "TotalAmt") or
        _child_text(item_element, "TP")
    )

    # Description: check element first, then item_element
    for el in (element, item_element):
        for child in el:
            if _tag(child) == "Description":
                desc = _desc_text(child)
                if desc:
                    break
        if desc:
            break

    # A node is a leaf position if it has a non-zero quantity
    qty = _parse_decimal(qty_str)
    if qty is not None and desc:
        current_path = path + [itemno] if itemno else path
        oz = ".".join(p for p in current_path if p)

        unit_price = _parse_decimal(unit_price_str)
        total = _parse_decimal(total_str)
        if total is None and qty is not None and unit_price is not None:
            total = round(qty * unit_price, 2)

        positions.append({
            "oz": oz,
            "description": desc,
            "qty": qty,
            "unit": unit_str,
            "unit_price": unit_price,
            "total": total,
        })
        # Do NOT recurse into leaf nodes — sub-items of positions are text
        return

    # Structural node: recurse into children, extending the path
    current_path = path + [itemno] if itemno and local in _LEAF_TAGS else path
    for child in element:
        _walk(child, positions, current_path)