"""
analysis.py
Pure dta analysis functions
All  dashboard logic calls these so te code stays testable and clean
"""

import pandas as pd

def load_data(path: str = None):
    if path is None:
        path = os.path.join(BASE_DIR, "data", "project_costs.csv")
    df = pd.read_csv(path)
    df["start_date"] = pd.to_datetime(df["start_date"])
    df["end_date"] = pd.to_datetime(df["end_date"])
    return df

def portfolio_summary(df:pd.DataFrame):
    """Top-level KPIs across the whole portfolio"""
    total_budget=df["budget_eur"].sum()
    total_actual=df["actual_cost_eur"].sum()
    total_dev=total_actual-total_budget
    total_dev_pct=(total_dev/total_budget)*100

    high_risk=(df["risk_level"]=="High").sum()
    low_risk=(df["risk_level"]=="Low").sum()
    medium_risk=(df["risk_level"]=="Medium").sum()
    avg_progress=df["progress_pct"].mean()

    return{
        "total_budget_m":   round(total_budget / 1_000_000, 2),
        "total_actual_m":   round(total_actual / 1_000_000, 2),
        "total_dev_m":      round(total_dev / 1_000_000, 2),
        "total_dev_pct":    round(total_dev_pct, 1),
        "high_risk_count":  int(high_risk),
        "medium_risk_count":int(medium_risk),
        "avg_progress_pct": round(avg_progress, 1),
        "n_projects":       df["project_id"].nunique(),
    }

def project_summary(df: pd.DataFrame):
    """Aggregated totals per project."""
    grp = df.groupby(["project_id", "project_name"]).agg(
        budget_eur=("budget_eur", "sum"),
        actual_cost_eur=("actual_cost_eur", "sum"),
        deviation_eur=("deviation_eur", "sum"),
        avg_progress=("progress_pct", "mean"),
        high_risk_wps=("risk_level", lambda x: (x == "High").sum()),
    ).reset_index()

    grp["deviation_pct"] = ((grp["deviation_eur"] / grp["budget_eur"]) * 100).round(1)
    grp["budget_m"] = (grp["budget_eur"] / 1_000_000).round(2)
    grp["actual_m"] = (grp["actual_cost_eur"] / 1_000_000).round(2)
    grp["deviation_m"] = (grp["deviation_eur"] / 1_000_000).round(2)
    return grp


def work_package_breakdown(df: pd.DataFrame, project_id: str):
    """All work packages for a single project."""
    return df[df["project_id"] == project_id].copy()


def risk_distribution(df: pd.DataFrame):
    """Count of risk levels across entire portfolio."""
    return df["risk_level"].value_counts().reset_index().rename(
        columns={"index": "risk_level", "risk_level": "count"}
    )


def deviation_by_work_package_type(df: pd.DataFrame):
    """Average deviation % grouped by work package name — shows which types overrun most."""
    return (
        df.groupby("work_package")["deviation_pct"]
        .mean()
        .round(1)
        .sort_values(ascending=False)
        .reset_index()
        .rename(columns={"deviation_pct": "avg_deviation_pct"})
    )
