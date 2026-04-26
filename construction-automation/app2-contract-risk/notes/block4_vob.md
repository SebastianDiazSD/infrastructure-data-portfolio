block4_pymupdf.md

# App 2 — Tender Document Risk Analyzer

## Bugs

- Bug 1 — Page lookup finds the wrong occurrence
find_page() searches all pages for the clause title and returns the first match — which is the TOC page. The fix is to not search by text at all. Instead, build a character-position-to-page map. Since full_text is built by joining all pages with \n, every match's pos maps directly to a page number. That's deterministic and never wrong.
- Bug 2 — Duplicate sections in the same PDF
This document contains VOB/A commentary + VOB/A rules + VOB/B rules. The clause § 2 Grundsätze appears in all three. The fix is section anchoring — find where VOB/B actually starts in the text and only extract from that position onward.

## The VOB/B anchor

It's **PDF-specific**. The find_vob_b_start() function with the "Art und Umfang der Leistung" anchor works for the official combined VOB/A+B publication. Real client contracts will look completely different — they might have:

Only VOB/B clauses (no VOB/A at all)
Modified clause titles ("§ 13 Mängelansprüche, geändert gemäß BVB")
Additional clauses numbered after §18 (client-specific additions)
Clauses that reference VOB/B but use different headings

The anchor approach should be replaced with something more robust for production: instead of anchoring to a specific title string, anchor to a clause density signal — find the region where the regex matches the most § 1 through § 18 sequence with expected VOB/B titles. This is more resilient across PDF variants.

## Company-specific configuration

The actual business model.<br>
This is how professional B2B tools work. The architecture should be:<br>
```
config/
  DE_VOB_standard.json     ← base VOB/B config
  DB_InfraGO.json          ← DB-specific with their BVB additions  
  Spitzke.json             ← contractor-specific
  custom_template.json     ← what clients fill in during onboarding
```
Each config defines: clause pattern, section anchors, high-risk clause numbers, known client-specific clause titles, and risk vocabulary for that client type. Onboarding a new company = filling a config file, not rewriting code. This is exactly what the clause_patterns.py file already created is the foundation for. Expand to a JSON-based config system.<br>
This also means the pricing model shifts: not "pay per analysis" but "setup fee + subscription" — the setup fee covers the config work per company.

## The 6 highest-risk VOB/B clauses for the contractor

|Clause|Why it's high risk|
|--|--|
|§ 5 Ausführungsfristen|Tight deadlines + Vertragsstrafe triggers|
|§ 8 Kündigung durch den Auftraggeber|Unilateral termination with cost recovery risk|
|§ 11 Vertragsstrafe|Penalty caps and trigger conditions|
|§ 13 Mängelansprüche|4-year liability, defect scope, cost of remediation|
|§ 16 Zahlung|Payment timing, Schlussrechnung deadlines, Skonti traps|
|§ 17 Sicherheitsleistung|Retention amounts, return conditions|

## Risk language signals to add to the pattern:

"Vertragsstrafe", "Verzugszinsen", "Schadensersatz", "Verjährungsfrist", "Kündigung", "Sicherheitsleistung", "fruchtlos abgelaufen", "angemessene Frist"