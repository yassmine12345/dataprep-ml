"""Anomaly detection and preprocessing recommendation service."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def detect_anomalies(df: pd.DataFrame, target: str | None = None) -> dict[str, Any]:
    """Detect data-quality problems per feature and recommend preprocessing."""
    n_rows = len(df)
    problems: list[dict[str, Any]] = []
    feature_reports: dict[str, Any] = {}

    for col in df.columns:
        col_str = str(col)
        is_target = target is not None and col_str == str(target)
        series = df[col]
        is_numeric = pd.api.types.is_numeric_dtype(series)
        n_missing = int(series.isna().sum())
        n_unique = int(series.nunique(dropna=True))
        n_duplicated_values = int(series.duplicated().sum())

        feature_issues: list[dict[str, Any]] = []

        # Missing values
        if n_missing > 0:
            pct = 100.0 * n_missing / n_rows
            feature_issues.append(
                {
                    "type": "missing_values",
                    "feature": col_str,
                    "count": n_missing,
                    "percentage": round(pct, 2),
                    "description": (
                        f"{n_missing} out of {n_rows} values are missing "
                        f"({pct:.2f}%)."
                    ),
                    "recommendation": _recommend_missing(is_numeric, pct, n_rows),
                }
            )

        # Duplicated values (within column)
        if n_duplicated_values > 0 and n_unique > 1:
            pct = 100.0 * n_duplicated_values / n_rows
            feature_issues.append(
                {
                    "type": "duplicate_values",
                    "feature": col_str,
                    "count": n_duplicated_values,
                    "percentage": round(pct, 2),
                    "description": (
                        f"{n_duplicated_values} rows share a value already seen "
                        f"earlier in this column ({pct:.2f}%)."
                    ),
                    "recommendation": "duplicate_removal",
                }
            )

        # Outliers (numeric only)
        if is_numeric:
            clean = series.dropna()
            if len(clean) > 4:
                q1, q3 = clean.quantile(0.25), clean.quantile(0.75)
                iqr = q3 - q1
                lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                mask = (clean < lower) | (clean > upper)
                n_out = int(mask.sum())
                if n_out > 0:
                    pct = 100.0 * n_out / len(clean)
                    feature_issues.append(
                        {
                            "type": "outliers",
                            "feature": col_str,
                            "count": n_out,
                            "percentage": round(pct, 2),
                            "lower_bound": round(float(lower), 4),
                            "upper_bound": round(float(upper), 4),
                            "description": (
                                f"{n_out} values lie outside the IQR fence "
                                f"[{lower:.2f}, {upper:.2f}] ({pct:.2f}%)."
                            ),
                            "recommendation": _recommend_outlier(pct, is_target),
                        }
                    )

        # Suspicious categorical values / low cardinality
        if not is_numeric:
            # Inconsistent casing or whitespace
            non_null = series.dropna().astype(str)
            if len(non_null) > 0:
                stripped = non_null.str.strip()
                n_case = int((stripped.str.lower() != non_null).sum())
                if n_case > 0:
                    pct = 100.0 * n_case / n_rows
                    feature_issues.append(
                        {
                            "type": "inconsistent_categorical",
                            "feature": col_str,
                            "count": n_case,
                            "percentage": round(pct, 2),
                            "description": (
                                f"{n_case} values have leading/trailing whitespace "
                                f"or inconsistent casing ({pct:.2f}%)."
                            ),
                            "recommendation": "categorical_cleaning",
                        }
                    )

            # Constant or near-constant column
            if n_unique == 1 and n_missing == 0:
                feature_issues.append(
                    {
                        "type": "constant_column",
                        "feature": col_str,
                        "count": n_rows,
                        "percentage": 100.0,
                        "description": (
                            f"The column '{col_str}' has only one unique value "
                            f"across all rows."
                        ),
                        "recommendation": "drop_column",
                    }
                )
            elif n_unique <= 5 and n_missing == 0 and not is_target:
                feature_issues.append(
                    {
                        "type": "low_cardinality",
                        "feature": col_str,
                        "count": n_unique,
                        "percentage": round(100.0 * n_unique / n_rows, 2),
                        "description": (
                            f"The column '{col_str}' has only {n_unique} unique "
                            f"values; it may be an identifier or a low-variance feature."
                        ),
                        "recommendation": "label_encoding",
                    }
                )

        # Incorrect data type detection
        if not is_numeric and n_missing == 0:
            sample = series.dropna().astype(str).str.strip()
            if len(sample) > 0:
                numeric_like = sample.str.match(r"^-?\d+(\.\d+)?$")
                if numeric_like.mean() > 0.8:
                    feature_issues.append(
                        {
                            "type": "incorrect_type",
                            "feature": col_str,
                            "count": int(numeric_like.sum()),
                            "percentage": round(100.0 * numeric_like.mean(), 2),
                            "description": (
                                f"{int(numeric_like.sum())} values look numeric but "
                                f"the column is stored as {series.dtype}."
                            ),
                            "recommendation": "type_correction",
                        }
                    )

        feature_reports[col_str] = feature_issues
        problems.extend(feature_issues)

    # Row-level duplicates
    n_dup_rows = int(df.duplicated().sum())
    if n_dup_rows > 0:
        problems.append(
            {
                "type": "duplicate_rows",
                "feature": "__rows__",
                "count": n_dup_rows,
                "percentage": round(100.0 * n_dup_rows / n_rows, 2),
                "description": (
                    f"{n_dup_rows} rows are exact duplicates of other rows "
                    f"({100.0 * n_dup_rows / n_rows:.2f}%)."
                ),
                "recommendation": "duplicate_removal",
            }
        )

    return {
        "total_problems": len(problems),
        "problems": problems,
        "features": feature_reports,
    }


def _recommend_missing(is_numeric: bool, pct: float, n_rows: int) -> str:
    if pct > 40:
        return "drop_column"
    if is_numeric:
        return "median_imputation"
    return "mode_imputation"


def _recommend_outlier(pct: float, is_target: bool | None) -> str:
    if is_target:
        return "none"
    if pct > 5:
        return "clip_iqr"
    return "clip_iqr"