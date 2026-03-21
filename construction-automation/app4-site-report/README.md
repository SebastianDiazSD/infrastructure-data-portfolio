# App 4 — Site Inspection Report Generator

Generates German **Bautagesberichte** from structured input and voice notes.  
Stack: FastAPI + Claude API (claude-haiku-4-5) + python-docx + OpenAI Whisper

---

## Quick Start

```bash
# 1. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
cp .env.example .env
# Edit .env and add your API keys

# 4. Test Claude connection
python test_claude.py

# 5. Run the server
uvicorn main:app --reload
# → API docs at http://localhost:8000/docs
```

---

## Project Structure

```
app4/
├── main.py                        # FastAPI app entry point
├── requirements.txt
├── render.yaml                    # Render.com deploy config
├── test_claude.py                 # API key verification
├── .env.example
└── app/
    ├── routers/
    │   └── report.py              # POST /api/generate-report
    ├── models/
    │   └── report_request.py      # Pydantic input schema
    └── services/
        ├── claude_service.py      # Claude haiku-4-5 integration
        └── docx_service.py        # python-docx Bautagesbericht builder
```

---

## Bautagesbericht Schema (planned sections)

| Section              | Source                        | Day   |
|----------------------|-------------------------------|-------|
| Project header       | ReportRequest fields          | Day 2 |
| Weather & date       | ReportRequest fields          | Day 2 |
| Work performed       | Claude-generated text         | Day 1 |
| Workforce table      | ReportRequest.workforce       | Day 2 |
| Equipment table      | ReportRequest.equipment       | Day 2 |
| Issues / Störungen   | Claude-formatted issues field | Day 2 |
| Next day plan        | ReportRequest.next_steps      | Day 2 |
| Signature block      | Static template               | Day 2 |

---

## Deployment (Render.com)

1. Push repo to GitHub
2. Create new Web Service in Render → connect repo
3. Render auto-detects `render.yaml`
4. Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in Render dashboard → Environment
5. Deploy

---

## Window 1 Build Plan

| Day  | Date   | Goal                                          |
|------|--------|-----------------------------------------------|
| 0    | Mar 20 | Scaffold + Render test + Claude key verified  |
| 1    | Mar 21 | /health + /generate-report endpoint working   |
| 2    | Mar 22 | Full python-docx Bautagesbericht layout       |
| 3    | Mar 23 | React frontend wired → download .docx         |
| 4    | Mar 24 | BLOCKED (moving day)                          |
| 5    | Mar 25 | Whisper voice + Deploy to Render              |
