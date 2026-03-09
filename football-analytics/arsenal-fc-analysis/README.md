# ⚽ Arsenal FC Performance Analysis (2010–2021)

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://jahv3i5bsqmagxvzs9tvwb.streamlit.app/)

A complete data analysis and machine learning project focused on understanding  
**why Arsenal FC has not won the Premier League since 2003/04**.

This project combines **data engineering, exploratory analysis, visualization,  
and predictive modeling** using real Premier League match data.

> Built with discipline, curiosity, and respeto por los datos 🇨🇴

---

## 📌 Project Objectives

### Main Objective
Explain **how and why Arsenal FC’s performance declined** over the last decade  
despite financial strength, squad quality, and historical success.

### Specific Objectives
- Clean and structure a complex football dataset (4,000+ matches, 100+ features)
- Engineer match-level and season-level performance indicators
- Build final league tables per season
- Compare Arsenal against:
  - Top-4 teams
  - League champions
- Develop machine learning models to predict match outcomes

---

## 📂 Project Structure

```text
arsenal-fc-analysis/
│
├── app.py                     # Streamlit UI (orchestration only)
├── requirements.txt
├── README.md
│
├── data/
│   ├── df_full_premierleague.csv
│   └── data_dictionary.txt
│
├── src/
│   ├── schema.py              # Central column definitions (single source of truth)
│   ├── preprocessing.py       # Cleaning & feature engineering
│   ├── aggregation.py         # Season-level metrics
│   ├── visualization.py       # Plotly-based charts
│   └── modeling.py            # ML pipelines & evaluation
│
├── assets/
│   ├── objectives.jpg
│   └── webpage_image.jpeg
│
└── report/
    └── report.docx
```

---

## 📊 Dataset

* Source: Kaggle / Official Premier League data
* Coverage: Seasons 2010/11 to 2020/21 (partial)
* Granularity: Match-level statistics

See *data/data_dictionary.txt* for a full variable description.

---

## 🔧 Methodology Overview
### 1. Data Cleaning & Feature Engineering

Implemented in **src/preprocessing.py**:

* Removed redundant and high-leakage variables
* Parsed match results into:
  - Goals (home / away)
  - Points
  - Match outcome (H, D, A)
* Standardized date formats
* Ensured no duplicates or missing values

This mirrors the logic used -> modular and reusable.

___

### 2. Season-Level Aggregation

Implemented in **src/aggregation.py**:
* Total & average per-season metrics:
  - Points
  - Goals scored / conceded
  - Passes
  - Possession
  - Shots / shots on target
* League table construction
* Season ranking based on:
  1. Total points
  2. Goal difference

This produces the core dataset used for all visual analysis.

___

### 3. Visualization & Storytelling

Implemented in **src/visualization.py** using Plotly:

* 📈 League position over time (inverted axis)
* 🧭 Interactive metric exploration per team
* 🕸 Radar chart comparing Arsenal vs champions:
  - Points
  - Goals scored / conceded
  - Passes
  - Shots / shots on target

Radar metrics are normalized for interpretability.

___

### 4. Predictive Modeling

Implemented in **src/modeling.py**:

Classification task: Predict match outcome (Home win, Draw, Away win)

Models included:

* Logistic Regression
* K-Nearest Neighbors
* Random Forest
* Gradient Boosting
* Dummy Classifier (baseline)

Evaluation:

* Accuracy
* Confusion matrices (class-level behavior)

Findings:

* Logistic Regression performs best (~66%)
* Draws are hardest to predict (expected in football)

---

📈 Key Insights

* Arsenal’s offensive metrics are comparable to champions
* Defensive performance is the main differentiator
* Champion teams consistently:
  - Score >80 points
  - Maintain strong goal difference
* Arsenal’s best season (2013/14) still fell short

Sometimes the margin between glory and frustration
is just ***defensive consistency***.

---

🚀 How to Run the App

```bash
pip install -r requirements.txt
streamlit run app.py
```

---

👤 Author

Sebastian Arce Diaz
Civil Engineer | Infrastructure & Data Analytics
🇨🇴 Colombia → 🇩🇪 Germany

> Football taught me systems thinking.
> 
> Engineering taught me responsibility.
> 
> Data taught me humility.

