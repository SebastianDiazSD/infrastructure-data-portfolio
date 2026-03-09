"""
generate_data.py
Generates anonymised but realistic railway project cost tracking data.
Run once to produce project_costs.csv — the main data source for the dashboard.
"""

import pandas as pd
import numpy as np

np.random.seed(42)

# --- Project metadata ---
projects = [
    {"id": "PRJ-001", "name": "Electrification – Northern Corridor",   "budget_eur": 42_000_000, "start": "2023-01-01", "end": "2025-06-30"},
    {"id": "PRJ-002", "name": "Track Renewal – Zone B",                 "budget_eur": 18_500_000, "start": "2023-03-01", "end": "2024-12-31"},
    {"id": "PRJ-003", "name": "Signal System Upgrade – Main Line",      "budget_eur": 31_000_000, "start": "2022-09-01", "end": "2025-03-31"},
    {"id": "PRJ-004", "name": "Station Rehabilitation – Central Hub",   "budget_eur": 9_800_000,  "start": "2023-06-01", "end": "2024-09-30"},
    {"id": "PRJ-005", "name": "Bridge Replacement – Km 47.3",           "budget_eur": 5_200_000,  "start": "2023-08-01", "end": "2024-11-30"},
]

# Work packages per project
work_packages = {
    "PRJ-001": ["Civil Works", "Overhead Line Equipment", "Substations", "Testing & Commissioning", "Project Management"],
    "PRJ-002": ["Track Removal", "Earthworks", "New Track Laying", "Drainage", "Project Management"],
    "PRJ-003": ["Cable Installation", "Signal Hardware", "Software Integration", "Testing", "Project Management"],
    "PRJ-004": ["Structural Works", "M&E Services", "Finishes & Fit-out", "Accessibility", "Project Management"],
    "PRJ-005": ["Demolition", "Foundation Works", "Steel Structure", "Deck & Surfacing", "Project Management"],
}

# Budget split per work package (must sum to 1.0)
budget_splits = {
    "PRJ-001": [0.30, 0.28, 0.22, 0.12, 0.08],
    "PRJ-002": [0.15, 0.25, 0.35, 0.17, 0.08],
    "PRJ-003": [0.20, 0.30, 0.28, 0.14, 0.08],
    "PRJ-004": [0.35, 0.22, 0.28, 0.08, 0.07],
    "PRJ-005": [0.12, 0.28, 0.32, 0.20, 0.08],
}

records = []

for proj in projects:
    pid = proj["id"]
    total_budget = proj["budget_eur"]
    packages = work_packages[pid]
    splits = budget_splits[pid]

    for pkg, split in zip(packages, splits):
        pkg_budget = total_budget * split

        # Simulate cost overrun/underrun realism:
        # PM packages tend to overrun slightly, civil works more variable
        if pkg == "Project Management":
            overrun_factor = np.random.normal(1.08, 0.05)
        elif pkg in ["Civil Works", "Earthworks", "Structural Works", "Foundation Works"]:
            overrun_factor = np.random.normal(1.12, 0.10)
        else:
            overrun_factor = np.random.normal(1.03, 0.07)

        actual_cost = pkg_budget * max(0.70, overrun_factor)
        deviation_eur = actual_cost - pkg_budget
        deviation_pct = (deviation_eur / pkg_budget) * 100

        # Progress (% complete) — realistic spread
        if pid in ["PRJ-002", "PRJ-004", "PRJ-005"]:
            progress = np.random.uniform(85, 100)
        elif pid == "PRJ-003":
            progress = np.random.uniform(60, 90)
        else:
            progress = np.random.uniform(40, 75)

        # Risk flag
        if deviation_pct > 10:
            risk = "High"
        elif deviation_pct > 5:
            risk = "Medium"
        else:
            risk = "Low"

        records.append({
            "project_id":        pid,
            "project_name":      proj["name"],
            "work_package":      pkg,
            "budget_eur":        round(pkg_budget, 0),
            "actual_cost_eur":   round(actual_cost, 0),
            "deviation_eur":     round(deviation_eur, 0),
            "deviation_pct":     round(deviation_pct, 2),
            "progress_pct":      round(progress, 1),
            "start_date":        proj["start"],
            "end_date":          proj["end"],
            "risk_level":        risk,
        })

df = pd.DataFrame(records)
df.to_csv("data/project_costs.csv", index=False)
print(f"Generated {len(df)} records across {len(projects)} projects.")
print(df.groupby("project_id")[["budget_eur", "actual_cost_eur"]].sum())
