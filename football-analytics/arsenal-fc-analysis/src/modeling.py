"""
Modeling Module
---------------
Machine learning pipeline for match outcome prediction.

Models included:
- DummyClassifier (baseline)
- Logistic Regression
- K-Nearest Neighbors
- Random Forest
- Gradient Boosting

Author: Sebastian Arce Diaz
"""

import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, confusion_matrix

from src.schema import (
    WINNER_COL
)

# ======================================================
# Feature preparation (leakage-safe)
# ======================================================
def prepare_features(df: pd.DataFrame):
    """
    Prepare X and y using ONLY pre-match information.
    Prevents data leakage.
    """

    y = df[WINNER_COL]

    allowed_prefixes = ("home_", "away_")
    forbidden_keywords = (
        "goal",
        "result",
        "points",
        "winner",
        "_acum",
        "sg_match",
    )

    feature_cols = [
        col for col in df.columns
        if col.startswith(allowed_prefixes)
        and not any(bad in col.lower() for bad in forbidden_keywords)
    ]

    X = df[feature_cols].select_dtypes(include="number")

    # Align X and y, remove NaNs
    valid_idx = X.dropna().index
    X = X.loc[valid_idx]
    y = y.loc[valid_idx]

    return X, y


# ======================================================
# Train-test split (time-aware)
# ======================================================
def split_data(X, y, test_size=0.25):
    return train_test_split(
        X,
        y,
        test_size=test_size,
        shuffle=False
    )


# ======================================================
# Model training
# ======================================================
def train_models(X_train, y_train):
    """
    Train multiple classifiers.
    """

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    models = {
        "Dummy (Most Frequent)": DummyClassifier(strategy="most_frequent"),
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "KNN": KNeighborsClassifier(),
        "Random Forest": RandomForestClassifier(
            n_estimators=200,
            random_state=321,
            n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingClassifier(random_state=321),
    }

    for model in models.values():
        model.fit(X_train_scaled, y_train)

    return models, scaler


# ======================================================
# Evaluation + confusion matrices
# ======================================================
def evaluate_models(models, scaler, X_test, y_test):
    """
    Evaluate models with accuracy and confusion matrices.
    """

    X_test_scaled = scaler.transform(X_test)

    results = []
    confusion_matrices = {}

    for name, model in models.items():
        preds = model.predict(X_test_scaled)

        results.append({
            "Machine learning algorithm": name,
            "Accuracy": accuracy_score(y_test, preds)
        })

        confusion_matrices[name] = confusion_matrix(
            y_test,
            preds,
            labels=["H", "D", "A"]
        )

    results_df = pd.DataFrame(results).sort_values(
        "Accuracy", ascending=False
    ).reset_index(drop=True)

    return results_df, confusion_matrices
