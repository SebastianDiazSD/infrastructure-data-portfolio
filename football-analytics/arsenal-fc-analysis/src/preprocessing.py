"""
Preprocessing Module
--------------------
Match-level cleaning and feature engineering.

This logic is extracted verbatim from the original
Arsenal FC notebook (In[3]–In[6]).

Author: Sebastian Arce Diaz
"""

import pandas as pd

from src.schema import (
    UNNAMED_INDEX_COL,
    LINK_MATCH_COL,
    RESULT_FULL_COL,
    RESULT_HT_COL,
    DATE_COL,
    HOME_GOALS,
    AWAY_GOALS,
    POINTS_HOME,
    POINTS_AWAY,
    WINNER_COL,
    WIN_COL,
    LOSS_COL,
    DRAW_COL
)


# ======================================================
# Core cleaning
# ======================================================
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove unused columns and format date column.
    """

    df = df.copy()

    # Drop obvious non-analytical columns
    columns_to_drop = [
        UNNAMED_INDEX_COL,
        LINK_MATCH_COL,
        RESULT_HT_COL
    ]

    df.drop(columns=columns_to_drop, inplace=True, errors="ignore")

    # Robust date parsing (dataset contains mixed formats)
    df[DATE_COL] = pd.to_datetime(
        df[DATE_COL],
        dayfirst=True,
        format="mixed",
        errors="coerce"
    )

    return df


# ======================================================
# Match outcome features
# ======================================================
def add_match_outcome_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create goals, points, W/L/D, and winner columns.
    """

    df = df.copy()

    # Goals from full-time result
    df[HOME_GOALS] = df[RESULT_FULL_COL].str.split("-").str[0].astype(int)
    df[AWAY_GOALS] = df[RESULT_FULL_COL].str.split("-").str[1].astype(int)

    # Initialize columns
    df[POINTS_HOME] = 0
    df[POINTS_AWAY] = 0

    df[WINNER_COL] = ""
    df[WIN_COL] = 0
    df[LOSS_COL] = 0
    df[DRAW_COL] = 0

    # Match outcome logic (original loop preserved)
    for idx in df.index:
        if df.loc[idx, HOME_GOALS] > df.loc[idx, AWAY_GOALS]:
            df.loc[idx, POINTS_HOME] = 3
            df.loc[idx, WINNER_COL] = "H"
            df.loc[idx, WIN_COL] = 1

        elif df.loc[idx, HOME_GOALS] < df.loc[idx, AWAY_GOALS]:
            df.loc[idx, POINTS_AWAY] = 3
            df.loc[idx, WINNER_COL] = "A"
            df.loc[idx, LOSS_COL] = 1

        else:
            df.loc[idx, POINTS_HOME] = 1
            df.loc[idx, POINTS_AWAY] = 1
            df.loc[idx, WINNER_COL] = "D"
            df.loc[idx, DRAW_COL] = 1

    return df
