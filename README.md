# 🏗️ Infrastructure & Data Portfolio

**Sebastian Arce Diaz** · Civil Engineer × CS Master's Student  
Railway Infrastructure · Construction Automation · AI-Powered Inspection · Python

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sebastian_Arce_Diaz-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/sebastian-arce-diaz91/)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-00FFFF?style=flat&logo=yolo&logoColor=black)
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=flat&logo=flutter&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white)

---

## 👋 About this repository

This portfolio applies **data engineering, machine learning, and software development** to problems I have lived as a civil and railway engineer.

Every project here is inspired by real challenges encountered at Deutsche Bahn and on large infrastructure programmes — defect detection in the field, cost overruns, schedule slippage, reporting overhead, and the difficulty of making sense of messy project data under deadline pressure.

The goal: **turn raw project data and field observations into engineering decisions.**

---

## 📂 Projects

### ⚙️ Construction Automation

| Project | Description | Tech | Status |
|---|---|---|---|
| [App 1 — Sleeper Defect Detection](./construction-automation/app1-track-inspection) | YOLOv8s object detection for railway concrete sleeper surface defects. Ground-level smartphone photos. 3 defect classes. Two-layer architecture: YOLO detection + Claude Vision severity assessment. mAP50=0.702. | YOLOv8, ONNX, Python, Google Colab | 🚧 Flutter in progress |
| [App 4 — Site Inspection Reporter](https://g2tech-site-reporter.onrender.com) | AI-powered construction site report generator. Voice/text input via Whisper transcription, Claude API for structured report generation, FastAPI backend, React frontend. | FastAPI, Whisper, Claude API, React | ✅ Live |

---

### 🚆 Railway & Infrastructure Analytics

| Project | Description | Tech | Status |
|---|---|---|---|
| Cost Deviation Tracker | Visualises planned vs actual costs across project phases. Flags deviation thresholds and produces summary reports. | Pandas, Plotly | 📋 Planned |
| Schedule Risk Dashboard | Monte Carlo simulation on activity durations to estimate P50/P80 completion dates. | NumPy, Plotly | 📋 Planned |
| Progress S-Curve Generator | Generates earned-value S-curves from raw progress data exports. | Pandas, Matplotlib | 📋 Planned |

---

### ⚽ Football Analytics

| Project | Description | Tech | Status |
|---|---|---|---|
| [Arsenal FC Performance Analysis](./football-analytics/arsenal-fc-analysis) | Interactive Streamlit dashboard analysing season performance: goals, xG, pass accuracy, defensive metrics. Scrapes live StatsBomb data. | Streamlit, Pandas, Plotly, StatsBomb API | [✅ Live](https://arsenal-fc.streamlit.app/) |

---

## 🗂️ Repository Structure

```
infrastructure-data-portfolio/
│
├── construction-automation/
│   ├── app1-track-inspection/      ← 🚧 YOLOv8 sleeper defect detection
│   └── app4-site-reporter/         ← ✅ live at onrender.com
│
├── railway-analytics/
│   ├── cost-deviation-tracker/     ← 📋 planned
│   ├── schedule-risk-dashboard/    ← 📋 planned
│   └── s-curve-generator/          ← 📋 planned
│
├── football-analytics/
│   └── arsenal-fc-analysis/        ← ✅ live on Streamlit
│
└── docs/
    └── screenshots/
```

---

## 🤖 App 1 — Sleeper Defect Detection (Highlight)

**The problem:** Railway concrete sleeper inspections are currently done manually by engineers walking the track. There is no mobile tool for ground-level opportunistic defect documentation — all existing AI inspection systems use top-down inspection trains or drones at a different visual scale entirely.

**The solution:** A smartphone app that detects and classifies surface defects in real time using a YOLOv8 model trained on original ground-level photographs, with a two-layer architecture separating detection (YOLO) from regulatory severity classification (Claude Vision API cross-referenced against DB Schadenklassen standards).

**Current training results (Run 3):**

```
mAP50 overall:       0.702
spalling_rail_seat:  mAP50=0.781, Precision=0.970
spalling_body:       mAP50=0.679
corner_breakout:     mAP50=0.647
Training time:       2.77h (Google Colab T4 GPU)
```

→ [Full project details](./construction-automation/app1-track-inspection)

---

## 🧠 Skills & Tools

**ML / Computer Vision:** YOLOv8 · ONNX · Python · OpenCV · Ultralytics  
**Mobile:** Flutter · ONNX Runtime  
**Backend:** FastAPI · Pydantic · Python  
**AI / LLM:** Claude API · OpenAI Whisper · GPT-4o Vision  
**Data & Analysis:** Pandas · NumPy · Scikit-learn · Matplotlib · Plotly  
**Dev tools:** GitHub · Google Colab · Label Studio · PyCharm  
**Deployment:** Render.com · IONOS · Streamlit Cloud  
**Infrastructure domain:** Railway project management · Earned Value · Risk analysis · DB standards  
**Languages:** Spanish (native) · English (fluent) · German (fluent)

---

## 🗺️ Ground2Tech Engineering Roadmap

| App | Description | Status |
|---|---|---|
| App 1 | Sleeper defect detection (YOLOv8 + Claude Vision) | 🚧 Flutter in progress |
| App 2 | Tender Document Risk Analyzer (VOB/B contracts) | 📋 Planned |
| App 3 | Construction Cost Estimator (LLM + XGBoost) | 📋 Planned |
| App 4 | Site Inspection Report Generator | ✅ Live |

---

## 🤝 Collaboration & Consulting

Open to conversations about research, collaboration, and consulting at the intersection of infrastructure engineering and applied AI.

📬 [LinkedIn — Sebastian Arce Diaz](https://www.linkedin.com/in/sebastian-arce-diaz91/)  
🌐 [ground2tech.com](https://ground2tech.com)
