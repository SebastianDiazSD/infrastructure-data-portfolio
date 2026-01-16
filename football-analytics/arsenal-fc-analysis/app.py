"""
Streamlit Application
---------------------
Main entry point for the Arsenal FC Performance Analysis App.

This file ONLY orchestrates:
- Data loading
- Section navigation
- Calling domain-specific modules

All logic lives in src/.
No shortcuts, no hidden state.

Author: Sebastian Arce Diaz
"""

# ======================================================
# Imports
# ======================================================
import streamlit as st
import pandas as pd

from src.preprocessing import (
    clean_data,
    add_match_outcome_features
)

from src.aggregation import (
    aggregate_season_performance
)

from src.visualization import (
    plot_league_position_over_time,
    plot_team_comparison_radar,
    plot_interactive_metric
)

from src.modeling import (
    prepare_features,
    split_data,
    train_models,
    evaluate_models
)

from src.schema import (
    SEASON_NUMBER_COL
)

# ======================================================
# Page configuration
# ======================================================
st.set_page_config(
    page_title="Arsenal FC | Performance Analysis",
    page_icon="⚽",
    layout="wide"
)

# ======================================================
# Sidebar
# ======================================================
st.sidebar.title("⚽ Arsenal FC Analysis")
st.sidebar.markdown(
    "Built with discipline, curiosity, and data  \n"
    "by **Sebastian Arce Diaz** 🇨🇴"
)

SECTION = st.sidebar.radio(
    "Navigation",
    [
        "Project Overview",
        "Season Performance",
        "Team Comparison",
        "Interactive Metrics",
        "Match Outcome Prediction"
    ]
)

# ======================================================
# Data loading (cached)
# ======================================================
@st.cache_data
def load_data() -> pd.DataFrame:
    """
    Load and preprocess the Premier League dataset.
    """
    df = pd.read_csv("data/df_full_premierleague.csv")
    df = clean_data(df)
    df = add_match_outcome_features(df)
    return df


df = load_data()

# ======================================================
# Sections
# ======================================================

# ------------------------------------------------------
# Project Overview
# ------------------------------------------------------
if SECTION == "Project Overview":

    st.title("⚽ Arsenal FC Performance Analysis")

    st.markdown(
        """
        This project analyzes **Arsenal FC's performance in the Premier League**
        from **2010 to 2021**, combining data analysis, visualization,
        and machine learning.

        The objective is simple:  
        understand *what changed*, *when it changed*, and *why it mattered*.
        """
    )

    col1, col2 = st.columns(2)
    col1.metric("Seasons analyzed", df["season"].nunique())
    col2.metric("Matches analyzed", len(df))


# ------------------------------------------------------
# Season Performance
# ------------------------------------------------------
elif SECTION == "Season Performance":

    st.title("📈 League Performance Over Time")

    performance_df = aggregate_season_performance(df)

    fig = plot_league_position_over_time(performance_df)
    st.plotly_chart(fig, width="stretch")

    st.markdown(
        "📌 Lower position means a better ranking —  \n"
        "simple rule, big consequences."
    )


# ------------------------------------------------------
# Team Comparison
# ------------------------------------------------------
elif SECTION == "Team Comparison":

    st.title("📊 Team Performance Snapshot")

    performance_df = aggregate_season_performance(df)

    fig = plot_team_comparison_radar(performance_df)
    st.plotly_chart(fig, width="stretch")

    st.markdown(
        "Arsenal is shown as a fixed reference across panels.  \n"
        "This makes differences visible, not abstract."
    )


# ------------------------------------------------------
# Interactive Metrics
# ------------------------------------------------------
elif SECTION == "Interactive Metrics":

    st.title("🧭 Interactive Performance Explorer")

    performance_df = aggregate_season_performance(df)

    available_metrics = [
        col for col in performance_df.columns
        if col not in ["Team", "Season", SEASON_NUMBER_COL]
    ]

    selected_metric = st.selectbox(
        "Choose a metric to explore",
        available_metrics
    )

    fig = plot_interactive_metric(
        performance_df,
        metric=selected_metric
    )

    st.plotly_chart(fig, width="stretch")

    st.markdown(
        "🔍 Exploration comes first.  \n"
        "Good models usually start with good questions."
    )


# ------------------------------------------------------
# Match Outcome Prediction
# ------------------------------------------------------
elif SECTION == "Match Outcome Prediction":

    st.title("🤖 Match Outcome Prediction")

    st.markdown(
        """
        In this section, machine learning models are used to predict
        match outcomes based on historical performance data.

        No magic involved —  
        just structured features and careful validation.
        """
    )

    X, y = prepare_features(df)
    X_train, X_test, y_train, y_test = split_data(X, y)

    models, scaler = train_models(X_train, y_train)
    results, confusion_matrices = evaluate_models(
        models, scaler, X_test, y_test
    )

    st.subheader("Model Performance")
    st.dataframe(results, width="stretch")

    st.subheader("Confusion Matrices")

    for model_name, cm in confusion_matrices.items():
        st.markdown(f"**{model_name}**")
        st.dataframe(
            pd.DataFrame(
                cm,
                index=["Actual H", "Actual D", "Actual A"],
                columns=["Pred H", "Pred D", "Pred A"]
            )
        )

    st.markdown(
        "📈 Results are realistic, not perfect —  \n"
        "which is exactly what we want in applied work."
    )

# ======================================================
# Footer
# ======================================================
st.markdown("---")
st.markdown(
    "Built with ❤️, structure, and patience  \n"
    "by **Sebastian Arce Diaz** 🇨🇴"
)
