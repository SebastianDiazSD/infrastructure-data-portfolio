# Step 1 — Get all clause match positions in the full text

import re
import pymupdf

import re
import pymupdf

CLAUSE_PATTERN = re.compile(
    r'(§\s*\d+[a-zA-Z]?)\s+([^\n]{3,80})',
    re.UNICODE
)

# Titles that are NOT real clause headings
NOISE_TITLE_PATTERN = re.compile(
    r'^(Absatz|Abs\.|bis\s|ff\.|BGB|GWB|VgV|InsO|ZPO|StGB|UStG|VOB|Nr\.|Nummer|'
    r'Nummern|wird|wurde|gilt|sind|ist|darf|kann|soll|muss|wurden|wegen|'
    r'entspricht|entsprechend)',
    re.IGNORECASE
)

def is_real_clause(title: str) -> bool:
    # Filter 1: TOC entry — title has 3+ consecutive dots
    if re.search(r'\.{3,}', title):
        return False
    # Filter 2: cross-reference — title starts with legal reference words
    if NOISE_TITLE_PATTERN.match(title.strip()):
        return False
    # Filter 3: title too short to be meaningful
    if len(title.strip()) < 4:
        return False
    return True

# PDF = "VOBTeilB.pdf"
PDF="vob_teil_a_und_b.pdf"

doc = pymupdf.open(PDF)

# Build pages_text list
pages_text = []
for page_num, page in enumerate(doc, start=1):
    text = page.get_text("text")
    pages_text.append({"page": page_num, "text": text})

full_text = "\n".join(p["text"] for p in pages_text)

# Find all clause matches
# all_matches = list(CLAUSE_PATTERN.finditer(full_text))
# clean_matches = [m for m in all_matches if is_real_clause(m.group(2))]
#
# print(f"Total matches: {len(all_matches)}")
# print(f"After filter:  {len(clean_matches)}")
# print()
# for m in clean_matches:
#     print(f"  pos={m.start()} number='{m.group(1).strip()}' title='{m.group(2).strip()}'")

# Step 2 — Add section anchoring for VOB/B:

# Known VOB/B section anchors — first clause of VOB/B is always § 1 Art und Umfang
VOB_B_ANCHORS = [
    "§ 1 Art und Umfang der Leistung",
    "§1 Art und Umfang der Leistung",
]

def find_vob_b_start(full_text: str) -> int:
    """
    Returns the character position where VOB/B content begins.
    Falls back to 0 (start of document) if not found.
    """
    for anchor in VOB_B_ANCHORS:
        # Find the LAST occurrence — VOB/B is always after VOB/A in these documents
        pos = full_text.rfind(anchor)
        if pos != -1:
            return pos
    return 0  # fallback: process entire document

# Step 3 — Page lookup helper

def build_page_offsets(pages_text: list[dict]) -> list[int]:
    """
    Returns a list where offsets[i] = character position in full_text
    where page i+1 begins.
    """
    offsets = []
    cumulative = 0
    for p in pages_text:
        offsets.append(cumulative)
        cumulative += len(p["text"]) + 1  # +1 for the \n added during join
    return offsets

def pos_to_page(pos: int, offsets: list[int]) -> int:
    """
    Given a character position in full_text, return the 1-indexed page number.
    """
    for i in range(len(offsets) - 1, -1, -1):
        if pos >= offsets[i]:
            return i + 1
    return 1

# Step 4 — Slice text between clause positions

def extract_clauses(full_text: str, pages_text: list[dict]) -> list[dict]:
    offsets = build_page_offsets(pages_text)

    # Only search from VOB/B section start
    vob_b_start = find_vob_b_start(full_text)
    search_text = full_text[vob_b_start:]

    all_matches = list(CLAUSE_PATTERN.finditer(search_text))
    clean_matches = [m for m in all_matches if is_real_clause(m.group(2))]

    clauses = []
    for i, match in enumerate(clean_matches):
        number = match.group(1).strip()
        title = match.group(2).strip()

        # Absolute position in full_text (match.start() is relative to search_text)
        abs_start = vob_b_start + match.start()
        abs_end = vob_b_start + (
            clean_matches[i + 1].start() if i + 1 < len(clean_matches)
            else len(search_text)
        )

        clause_text = full_text[abs_start:abs_end].strip()
        page_num = pos_to_page(abs_start, offsets)

        clauses.append({
            "number": number,
            "title": title,
            "text": clause_text,
            "page": page_num,
        })

    return clauses

# Step 5 — Wire it together and print results

clauses = extract_clauses(full_text, pages_text)

print(f"\nExtracted {len(clauses)} clauses:\n")
for c in clauses:
    preview = c["text"][:120].replace("\n", " ")
    print(f"[p.{c['page']}] {c['number']} — {c['title']}")
    print(f"         {preview}...")
    print()