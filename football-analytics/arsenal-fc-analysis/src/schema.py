"""
Schema Definition
-----------------
Canonical column names used across the Arsenal FC project.

This file contains:
- Raw dataset columns
- Engineered match-level columns
- Season-level aggregation columns

⚠️ This schema mirrors the original working notebook.
⚠️ Do NOT rename columns without changing the source logic.

Author: Sebastian Arce Diaz
"""

# ======================================================
# Raw dataset columns
# ======================================================
SEASON_COL = "season"
DATE_COL = "date"

HOME_TEAM_COL = "home_team"
AWAY_TEAM_COL = "away_team"

RESULT_FULL_COL = "result_full"
RESULT_HT_COL = "result_ht"

LINK_MATCH_COL = "link_match"
UNNAMED_INDEX_COL = "Unnamed: 0"

# Match statistics (home / away)
HOME_PASSES = "home_passes"
AWAY_PASSES = "away_passes"

HOME_SHOTS = "home_shots"
AWAY_SHOTS = "away_shots"

HOME_SHOTS_ON_TARGET = "home_shots_on_target"
AWAY_SHOTS_ON_TARGET = "away_shots_on_target"

HOME_POSSESSION = "home_possession"
AWAY_POSSESSION = "away_possession"

# ======================================================
# Engineered match-level columns
# (from original notebook In[4])
# ======================================================
HOME_GOALS = "home_goals"
AWAY_GOALS = "away_goals"

POINTS_HOME = "points_home"
POINTS_AWAY = "points_away"

WINNER_COL = "winner"  # H / A / D

WIN_COL = "W"
LOSS_COL = "L"
DRAW_COL = "D"

# ======================================================
# Season-level aggregation columns
# (from performance_per_season table)
# ======================================================
TEAM_COL = "Team"
SEASON_LABEL_COL = "Season"
SEASON_NUMBER_COL = "Season_number"

TABLE_STANDING_COL = "Table_standing"

TOTAL_POINTS = "Total_points"
TOTAL_GOALS_SCORED = "Total_goals_scored"
TOTAL_GOALS_CONCEDED = "Total_goals_conceded"
GOAL_DIFF = "Diff"

TOTAL_PASSES = "Total_passes"
TOTAL_SHOTS = "Total_shots"
TOTAL_SHOTS_ON_TARGET = "Total_shots_on_target"

AVG_POINTS = "Avg_points"
AVG_GOALS_SCORED = "Avg_goals_scored"
AVG_GOALS_CONCEDED = "Avg_goals_conceded"
AVG_PASSES = "Avg_passes"
AVG_SHOTS = "Avg_shots"
AVG_SHOTS_ON_TARGET = "Avg_shots_on_target"

AVG_POSSESSION = "Average_possession"
