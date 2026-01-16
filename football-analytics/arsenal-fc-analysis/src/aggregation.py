"""
Aggregation Module
------------------
Season-level aggregation and league table logic.

Extracted faithfully from the original notebook
(In[7]–In[14]).

Author: Sebastian Arce Diaz
"""

import pandas as pd

from src.schema import (
    SEASON_COL,
    TEAM_COL,
    SEASON_LABEL_COL,
    SEASON_NUMBER_COL,
    HOME_TEAM_COL,
    AWAY_TEAM_COL,
    POINTS_HOME,
    POINTS_AWAY,
    HOME_GOALS,
    AWAY_GOALS,
    HOME_PASSES,
    AWAY_PASSES,
    HOME_SHOTS,
    AWAY_SHOTS,
    HOME_SHOTS_ON_TARGET,
    AWAY_SHOTS_ON_TARGET,
    HOME_POSSESSION,
    AWAY_POSSESSION,
    TOTAL_POINTS,
    TOTAL_GOALS_SCORED,
    TOTAL_GOALS_CONCEDED,
    GOAL_DIFF,
    TOTAL_PASSES,
    TOTAL_SHOTS,
    TOTAL_SHOTS_ON_TARGET,
    AVG_POINTS,
    AVG_GOALS_SCORED,
    AVG_GOALS_CONCEDED,
    AVG_PASSES,
    AVG_SHOTS,
    AVG_SHOTS_ON_TARGET,
    AVG_POSSESSION,
    TABLE_STANDING_COL
)


# ======================================================
# Helper aggregation functions (verbatim logic)
# ======================================================
def _season_total(df, home_col, away_col, name_home, name_away):
    home = df.groupby([SEASON_COL, HOME_TEAM_COL], as_index=False).agg({home_col: "sum"})
    away = df.groupby([SEASON_COL, AWAY_TEAM_COL], as_index=False).agg({away_col: "sum"})
    merged = home.merge(away, on=SEASON_COL)
    return merged.rename(columns={home_col: name_home, away_col: name_away})


def _season_avg(df, home_col, away_col, name_home, name_away):
    home = df.groupby([SEASON_COL, HOME_TEAM_COL], as_index=False).agg({home_col: "mean"})
    away = df.groupby([SEASON_COL, AWAY_TEAM_COL], as_index=False).agg({away_col: "mean"})
    merged = home.merge(away, on=SEASON_COL)
    return merged.rename(columns={home_col: name_home, away_col: name_away})


# ======================================================
# Main aggregation
# ======================================================
def aggregate_season_performance(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build season-level performance table (one row per team per season).
    """

    # --- Totals ---
    points = _season_total(df, POINTS_HOME, POINTS_AWAY, "Points_home", "Points_away")
    goals_scored = _season_total(df, HOME_GOALS, AWAY_GOALS, "Goals_scored_home", "Goals_scored_away")
    goals_conceded = _season_total(df, AWAY_GOALS, HOME_GOALS, "Goals_conceded_home", "Goals_conceded_away")
    passes = _season_total(df, HOME_PASSES, AWAY_PASSES, "Passes_home", "Passes_away")
    shots = _season_total(df, HOME_SHOTS, AWAY_SHOTS, "Shots_home", "Shots_away")
    shots_ot = _season_total(
        df,
        HOME_SHOTS_ON_TARGET,
        AWAY_SHOTS_ON_TARGET,
        "Shots_on_target_home",
        "Shots_on_target_away"
    )

    # --- Averages ---
    avg_points = _season_avg(df, POINTS_HOME, POINTS_AWAY, "Avg_Points_home", "Avg_Points_away")
    avg_goals_scored = _season_avg(df, HOME_GOALS, AWAY_GOALS, "Avg_Goals_scored_home", "Avg_Goals_scored_away")
    avg_goals_conceded = _season_avg(df, AWAY_GOALS, HOME_GOALS, "Avg_Goals_conceded_home", "Avg_Goals_conceded_away")
    avg_passes = _season_avg(df, HOME_PASSES, AWAY_PASSES, "Avg_Passes_home", "Avg_Passes_away")
    avg_shots = _season_avg(df, HOME_SHOTS, AWAY_SHOTS, "Avg_Shots_home", "Avg_Shots_away")
    avg_shots_ot = _season_avg(
        df,
        HOME_SHOTS_ON_TARGET,
        AWAY_SHOTS_ON_TARGET,
        "Avg_Shots_on_target_home",
        "Avg_Shots_on_target_away"
    )
    avg_possession = _season_avg(
        df,
        HOME_POSSESSION,
        AWAY_POSSESSION,
        "Avg_Possession_home",
        "Avg_Possession_away"
    )

    # --- Merge everything ---
    performance = (
        points
        .merge(goals_scored, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(goals_conceded, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(passes, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_possession, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(shots, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(shots_ot, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_points, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_goals_scored, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_goals_conceded, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_passes, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_shots, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
        .merge(avg_shots_ot, on=[SEASON_COL, HOME_TEAM_COL, AWAY_TEAM_COL])
    )

    # Keep only home==away (original logic)
    performance = performance[performance[HOME_TEAM_COL] == performance[AWAY_TEAM_COL]]

    # Remove partial season 20/21
    performance = performance[performance[SEASON_COL] != "20/21"]

    # --- Final metrics ---
    performance[TOTAL_POINTS] = performance["Points_home"] + performance["Points_away"]
    performance[TOTAL_GOALS_SCORED] = performance["Goals_scored_home"] + performance["Goals_scored_away"]
    performance[TOTAL_GOALS_CONCEDED] = performance["Goals_conceded_home"] + performance["Goals_conceded_away"]
    performance[GOAL_DIFF] = performance[TOTAL_GOALS_SCORED] - performance[TOTAL_GOALS_CONCEDED]

    performance[TOTAL_PASSES] = performance["Passes_home"] + performance["Passes_away"]
    performance[TOTAL_SHOTS] = performance["Shots_home"] + performance["Shots_away"]
    performance[TOTAL_SHOTS_ON_TARGET] = (
        performance["Shots_on_target_home"] + performance["Shots_on_target_away"]
    )

    performance[AVG_POINTS] = (performance["Avg_Points_home"] + performance["Avg_Points_away"]) / 2
    performance[AVG_GOALS_SCORED] = (
        performance["Avg_Goals_scored_home"] + performance["Avg_Goals_scored_away"]
    ) / 2
    performance[AVG_GOALS_CONCEDED] = (
        performance["Avg_Goals_conceded_home"] + performance["Avg_Goals_conceded_away"]
    ) / 2
    performance[AVG_PASSES] = (performance["Avg_Passes_home"] + performance["Avg_Passes_away"]) / 2
    performance[AVG_SHOTS] = (performance["Avg_Shots_home"] + performance["Avg_Shots_away"]) / 2
    performance[AVG_SHOTS_ON_TARGET] = (
        performance["Avg_Shots_on_target_home"] + performance["Avg_Shots_on_target_away"]
    ) / 2
    performance[AVG_POSSESSION] = (
        performance["Avg_Possession_home"] + performance["Avg_Possession_away"]
    ) / 2

    # --- Table standing ---
    performance = performance.sort_values(
        [SEASON_COL, TOTAL_POINTS, GOAL_DIFF],
        ascending=[True, False, False]
    )

    team_count = performance.groupby(SEASON_COL)[HOME_TEAM_COL].count().tolist()
    rank_column = []
    for n in team_count:
        rank_column.extend(range(1, n + 1))

    performance[TABLE_STANDING_COL] = rank_column

    # Rename final columns
    performance = performance.rename(columns={
        HOME_TEAM_COL: TEAM_COL,
        SEASON_COL: SEASON_LABEL_COL
    })

    # Season number encoding
    seasons = performance[SEASON_LABEL_COL].unique().tolist()
    performance[SEASON_NUMBER_COL] = performance[SEASON_LABEL_COL].apply(seasons.index)

    performance.reset_index(drop=True, inplace=True)

    return performance
