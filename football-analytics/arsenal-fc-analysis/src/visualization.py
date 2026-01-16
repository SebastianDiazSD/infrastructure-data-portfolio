"""
Visualization Module
--------------------
All visual outputs for the Arsenal FC project.

This module faithfully reproduces:
- Radar charts (Arsenal as reference)
- League position over time
- Interactive metric exploration

Author: Sebastian Arce Diaz
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from src.schema import (
    TEAM_COL,
    SEASON_LABEL_COL,
    SEASON_NUMBER_COL,
    TABLE_STANDING_COL,
    TOTAL_POINTS,
    TOTAL_GOALS_SCORED,
    TOTAL_GOALS_CONCEDED,
    TOTAL_PASSES,
    TOTAL_SHOTS,
    TOTAL_SHOTS_ON_TARGET,
    AVG_POINTS,
    AVG_GOALS_SCORED,
    AVG_GOALS_CONCEDED,
    AVG_PASSES,
    AVG_SHOTS,
    AVG_SHOTS_ON_TARGET
)

# ======================================================
# League position over time (Seaborn logic → Plotly)
# ======================================================
def plot_league_position_over_time(df: pd.DataFrame) -> go.Figure:
    """
    Line plot of table standing by season.
    Lower is better (inverted axis).
    """

    fig = go.Figure()

    for team in df[TEAM_COL].unique():
        team_df = df[df[TEAM_COL] == team]
        fig.add_trace(
            go.Scatter(
                x=team_df[SEASON_LABEL_COL],
                y=team_df[TABLE_STANDING_COL],
                mode="lines+markers",
                name=team
            )
        )

    fig.update_yaxes(autorange="reversed")
    fig.update_layout(
        title="Table Standing by Season",
        xaxis_title="Season",
        yaxis_title="Table Standing",
        legend_title="Team",
        height=600
    )

    return fig


# ======================================================
# Radar chart — Arsenal as reference (CRITICAL)
# ======================================================
def plot_team_comparison_radar(performance_df: pd.DataFrame) -> go.Figure:
    """
    Radar chart comparing Arsenal to league champions.
    This reproduces notebook logic exactly.
    """

    # Teams of interest (champions + Arsenal)
    champions_vs_arsenal = (
        performance_df[performance_df[TABLE_STANDING_COL] == 1][TEAM_COL]
        .unique()
        .tolist()
    )

    if "Arsenal" not in champions_vs_arsenal:
        champions_vs_arsenal.append("Arsenal")

    # Metrics (same order as notebook)
    metrics = [
        AVG_POINTS,
        AVG_GOALS_SCORED,
        AVG_GOALS_CONCEDED,
        AVG_PASSES,
        AVG_SHOTS,
        AVG_SHOTS_ON_TARGET
    ]

    # Compute averages per team
    values = []
    for team in champions_vs_arsenal:
        team_avg = (
            performance_df[performance_df[TEAM_COL] == team][metrics]
            .mean()
            .values
        )
        values.append(team_avg)

    values = np.array(values)

    # 🔥 EXACT normalization from notebook
    values = 5 * (values / np.linalg.norm(values, axis=0))

    radar_df = pd.DataFrame(values, columns=metrics)
    radar_df[TEAM_COL] = champions_vs_arsenal

    # Layout: Arsenal repeated in all subplots
    fig = make_subplots(
        rows=3,
        cols=2,
        specs=[[{"type": "polar"}] * 2] * 3,
        subplot_titles=radar_df[TEAM_COL].tolist()
    )

    # Arsenal index
    arsenal_idx = radar_df[radar_df[TEAM_COL] == "Arsenal"].index[0]

    # Plot Arsenal everywhere (orange, reference)
    for r in range(1, 4):
        for c in range(1, 3):
            fig.add_trace(
                go.Scatterpolar(
                    r=radar_df.loc[arsenal_idx, metrics].values,
                    theta=metrics,
                    name="Arsenal",
                    line=dict(color="orange"),
                    fill="toself",
                    showlegend=(r == 3 and c == 1)
                ),
                r,
                c
            )

    # Plot champions on top
    plot_positions = [(1,1),(1,2),(2,1),(2,2),(3,1)]
    for idx, (row, col) in zip(range(len(radar_df)), plot_positions):
        if idx == arsenal_idx:
            continue

        fig.add_trace(
            go.Scatterpolar(
                r=radar_df.loc[idx, metrics].values,
                theta=metrics,
                name=radar_df.loc[idx, TEAM_COL],
                fill="toself"
            ),
            row,
            col
        )

    fig.update_layout(
        title="Team Performance Comparison (Arsenal as Reference)",
        height=900,
        showlegend=True
    )

    return fig


# ======================================================
# Interactive metric exploration
# ======================================================
def plot_interactive_metric(df: pd.DataFrame, metric: str) -> go.Figure:
    """
    Interactive line chart for any season-level metric.
    """

    fig = go.Figure()

    for team in df[TEAM_COL].unique():
        team_df = df[df[TEAM_COL] == team]
        fig.add_trace(
            go.Scatter(
                x=team_df[SEASON_LABEL_COL],
                y=team_df[metric],
                mode="lines",
                name=team
            )
        )

    fig.update_layout(
        title=f"{metric} by Season",
        xaxis_title="Season",
        yaxis_title=metric,
        height=600
    )

    if metric == TABLE_STANDING_COL:
        fig.update_yaxes(autorange="reversed")

    return fig
