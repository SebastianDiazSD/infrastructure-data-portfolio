# 🚆 Railway Project Cost Deviation Tracker

An interactive Streamlit dashboard for monitoring cost performance across a portfolio of railway infrastructure projects — tracking budget vs actual spend, deviation analysis, work package breakdowns, and risk flags.

> Built by a civil engineer who spent 5 years watching cost reports arrive too late to act on them.

---

## 📸 Dashboard Preview

![Dashboard Overview](cost-deviation-tracker/docs/screenshots/cost-tracker-overview.png)

---

## 🎯 What problem does this solve?

On large infrastructure programmes, cost data typically lives in SAP exports or Excel trackers that are:
- Updated monthly (at best)
- Shared as static PDFs
- Impossible to filter or drill into quickly

This dashboard gives a project manager or client an **interactive, real-time view** of where money is going and which work packages are at risk — in under 30 seconds.

---

## 📊 Features

**Portfolio Overview**
- KPI strip: total budget, actual cost, overrun %, risk counts, avg. progress
- Budget vs actual grouped bar chart per project
- Deviation % horizontal bar chart with 10% threshold line
- Construction progress by project
- Risk distribution pie chart (High / Medium / Low)
- Average deviation by work package type (identifies which trades overrun most)
- Filterable raw data table

**Project Drilldown**
- Select any project to see work-package-level breakdown
- Budget vs actual per work package
- Deviation % with risk colour coding
- Live progress bars per work package

---

## 🚀 Getting started

```bash
# 1. Clone the repo
git clone https://github.com/SebastianDiazSD/infrastructure-data-portfolio.git
cd infrastructure-data-portfolio/railway-analytics/cost-deviation-tracker

# 2. Install dependencies
pip install -r requirements.txt

# 3. Generate sample data (only needed once)
python data/generate_data.py

# 4. Run the dashboard
streamlit run app.py
```

The app opens at `http://localhost:8501`

---

## 📁 Project structure

```
cost-deviation-tracker/
├── app.py                  ← Streamlit dashboard
├── analysis.py             ← Pure Pandas analysis functions (no UI dependency)
├── requirements.txt
├── data/
│   ├── generate_data.py    ← Generates anonymised sample data
│   └── project_costs.csv   ← Generated dataset (25 work packages × 5 projects)
└── docs/
    └── screenshots/        ← Add dashboard screenshots here
```

---

## 🗃️ Data schema

`data/project_costs.csv`

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | str | Project identifier (PRJ-001 … PRJ-005) |
| `project_name` | str | Anonymised project name |
| `work_package` | str | Work package within the project |
| `budget_eur` | float | Planned cost in EUR |
| `actual_cost_eur` | float | Actual/forecast cost in EUR |
| `deviation_eur` | float | actual − budget |
| `deviation_pct` | float | (deviation / budget) × 100 |
| `progress_pct` | float | Physical % complete |
| `start_date` | date | Project start |
| `end_date` | date | Planned completion |
| `risk_level` | str | High (>10%) / Medium (>5%) / Low |

**Note:** All data is synthetically generated and does not represent any real project or organisation.

---

## 🔮 Planned improvements

- [ ] S-curve (earned value) overlay per project
- [ ] Monthly cost burn trend chart
- [ ] PDF export of project summary report
- [ ] Upload your own CSV to analyse real project data
- [ ] Streamlit Cloud deployment (live demo link coming soon)

---

## 🧠 Tech stack

`Python` · `Pandas` · `Plotly` · `Streamlit` · `NumPy`

---

## 👤 Author

**Sebastian Arce Diaz** — Civil Engineer · MSc Computer Science (University of York)  
5+ years in railway infrastructure project engineering and site supervision in Germany (Deutsche Bahn 2020–2024 · currently Bauüberwacher Bahn)  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/sebastian-arce-diaz91/)
