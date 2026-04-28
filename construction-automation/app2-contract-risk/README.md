# App 2 — Tender Document Risk Analyzer

**Status:** In development — launching May 2026
**Part of:** Ground2Tech Engineering — AI Copilot for Railway Construction Supervision

---

## Problem

German construction contracts under VOB/B contain clauses that carry significant legal,
commercial, and scheduling risk for contractors and site supervisors. Reviewing these
manually is time-consuming and requires specialist knowledge. Risks in §8 (termination),
§13 (defect liability), and §16 (payment) clauses are routinely missed until a dispute arises.

---

## What It Does

Upload a VOB/B contract PDF. The app extracts individual clauses, classifies each by
risk level (low / medium / high) and risk category (legal / commercial / schedule / technical),
and presents the analysis in a split-pane view alongside the original document text.

A risk summary and top-3 high-risk clauses are shown at the top. Each clause includes
a plain-language explanation and a suggested modification for negotiation.

---

## Architecture

PDF upload (FastAPI)
- PyMuPDF text extraction
- Regex clause parser (§4, §5, §6, §8, §13, §16...)
- Claude haiku-4-5 risk classification (per clause)
- React split-pane UI (PDF text | risk analysis)
- DOCX export (risk report)

---

## Stack

- Backend: FastAPI + PyMuPDF + Claude haiku-4-5
- Frontend: React + Tailwind CSS
- Deployment: Render.com (Frankfurt, EU)
- Domain: risk.ground2tech.com (planned)

---

## Scope and Disclaimer

This tool provides engineering decision support. It does not constitute legal advice.
All risk assessments require human review before use in contract negotiations or
legal proceedings.

---

## Roadmap

- V1 (May 2026): VOB/B text PDFs, §4/§8/§13/§16 clause detection, split-pane UI, DOCX export
- V2: Multiple document upload (LV + Baubeschreibung + contract), clause comparison against standard VOB/B text
- V3: Integration with App 4 — flagged contract risks linked to site report defect entries

---

## Planned Extension — Nachtragsmanagement (Phase 2)

Post-signing workflow: compare Nachtrag claims against the original LV,
VOB/B §2 justification check, price reasonableness assessment, memo generation.
