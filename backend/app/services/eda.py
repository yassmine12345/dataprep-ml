"""Exploratory Data Analysis service."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def compute_eda(df: pd.DataFrame, target: str | None = None) -> dict[str, Any]:
    """Compute a comprehensive EDA report for the dataset."""
    n_rows, n_cols = df.shape
    missing_total = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    # Column types
    column_types: list[dict[str, Any]] = []
    for col in df.columns:
        col_type = "numeric" if pd.api.types.is_numeric_dtype(df[col]) else "categorical"
        column_types.append(
            {
                "name": str(col),
                "dtype": str(df[col].dtype),
                "kind": col_type,
                "n_unique": int(df[col].nunique(dropna=True)),
                "n_missing": int(df[col].isna().sum()),
                "missing_pct": round(100.0 * df[col].isna().mean(), 2),
            }
        )

    # Descriptive statistics
    desc = df.describe(include="all").T
    desc = desc.reset_index()
    desc.columns = ["column"] + list(desc.columns[1:])
    stats = _serialise_df(desc)

    # Missing values per column
    missing = (
        df.isna()
        .sum()
        .reset_index(name="missing")
    )
    missing.columns = ["column", "missing"]
    missing["pct"] = (100.0 * missing["missing"] / n_rows).round(2)
    missing = _serialise_df(missing)

    # Unique values per column
    unique = (
        df.nunique(dropna=True)
        .reset_index(name="unique")
    )
    unique.columns = ["column", "unique"]
    unique = _serialise_df(unique)

    # Numeric distributions
    numeric_cols = [str(c) for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    numeric_dist: dict[str, Any] = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if series.empty:
            numeric_dist[col] = None
            continue
        numeric_dist[col] = {
            "min": _num(series.min()),
            "q1": _num(series.quantile(0.25)),
            "median": _num(series.median()),
            "q3": _num(series.quantile(0.75)),
            "max": _num(series.max()),
            "mean": _num(series.mean()),
            "std": _num(series.std()),
            "skew": _num(series.skew()),
            "kurtosis": _num(series.kurtosis()),
        }

    # Categorical distributions
    categorical_cols = [
        str(c) for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])
    ]
    categorical_dist: dict[str, Any] = {}
    for col in categorical_cols:
        value_counts = df[col].value_counts(dropna=True).head(20)
        categorical_dist[col] = {
            "top_values": [
                {"value": _serialise_value(k), "count": int(v)}
                for k, v in value_counts.items()
            ],
            "n_unique": int(df[col].nunique(dropna=True)),
        }

    # Outlier detection (IQR) for numeric columns
    outliers: dict[str, Any] = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if series.empty:
            outliers[col] = None
            continue
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        n_out = int(((series < lower) | (series > upper)).sum())
        outliers[col] = {
            "n_outliers": n_out,
            "pct_outliers": round(100.0 * n_out / max(1, len(series)), 2),
            "lower_bound": _num(lower),
            "upper_bound": _num(upper),
        }

    # Correlation matrix
    corr_matrix: list[list[float]] | None = None
    corr_cols: list[str] = []
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr(method="pearson")
        corr_cols = [str(c) for c in corr.columns]
        corr_matrix = [[round(float(v), 4) for v in row] for row in corr.values.tolist()]

    return {
        "n_rows": n_rows,
        "n_columns": n_cols,
        "missing_total": missing_total,
        "missing_pct": round(100.0 * missing_total / max(1, n_rows * n_cols), 2),
        "duplicate_rows": duplicate_rows,
        "duplicate_pct": round(100.0 * duplicate_rows / max(1, n_rows), 2),
        "column_types": column_types,
        "statistics": stats,
        "missing_values": missing,
        "unique_values": unique,
        "numeric_distributions": numeric_dist,
        "categorical_distributions": categorical_dist,
        "outliers": outliers,
        "correlation_columns": corr_cols,
        "correlation_matrix": corr_matrix,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "target": target,
    }


def _serialise_df(frame: pd.DataFrame) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for _, row in frame.iterrows():
        rec: dict[str, Any] = {}
        for col, val in row.items():
            rec[str(col)] = _serialise_value(val)
        records.append(rec)
    return records


def _serialise_value(val: Any) -> Any:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, (pd.Timestamp,)):
        return val.isoformat()
    if isinstance(val, (bytes, bytearray)):
        try:
            return val.decode("utf-8", errors="replace")
        except Exception:
            return str(val)
    return val


def _num(val: Any) -> Any:
    if isinstance(val, (np.floating, float)):
        if np.isnan(val) or np.isinf(val):
            return None
        return round(float(val), 4)
    if isinstance(val, (np.integer, int)):
        return int(val)
    return val