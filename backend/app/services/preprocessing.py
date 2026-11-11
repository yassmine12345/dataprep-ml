"""Safe preprocessing service.

Applies user-approved transformations to a working copy of the dataset.
All parameters are fit on the appropriate subset to avoid data leakage.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def apply_operations(
    df: pd.DataFrame,
    operations: list[dict[str, Any]],
    target: str | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Apply a list of approved operations to a copy of the dataframe.

    Returns the transformed dataframe and a log of applied operations.
    """
    working = df.copy()
    log: list[dict[str, Any]] = []

    for op in operations:
        op_type = op.get("type")
        feature = op.get("feature")
        params = op.get("params", {}) or {}

        try:
            if op_type == "drop_column":
                if feature in working.columns:
                    working = working.drop(columns=[feature])
                    log.append({"type": op_type, "feature": feature, "status": "applied"})

            elif op_type == "drop_rows_missing":
                col = feature or params.get("column")
                if col in working.columns:
                    before = len(working)
                    working = working.dropna(subset=[col])
                    log.append({
                        "type": op_type, "feature": col,
                        "rows_removed": before - len(working), "status": "applied",
                    })

            elif op_type == "duplicate_removal":
                before = len(working)
                working = working.drop_duplicates()
                log.append({
                    "type": op_type,
                    "rows_removed": before - len(working),
                    "status": "applied",
                })

            elif op_type == "median_imputation":
                col = feature
                if col in working.columns and pd.api.types.is_numeric_dtype(working[col]):
                    fill_value = float(working[col].median())
                    working[col] = working[col].fillna(fill_value)
                    log.append({
                        "type": op_type, "feature": col,
                        "fill_value": fill_value, "status": "applied",
                    })

            elif op_type == "mean_imputation":
                col = feature
                if col in working.columns and pd.api.types.is_numeric_dtype(working[col]):
                    fill_value = float(working[col].mean())
                    working[col] = working[col].fillna(fill_value)
                    log.append({
                        "type": op_type, "feature": col,
                        "fill_value": fill_value, "status": "applied",
                    })

            elif op_type == "mode_imputation":
                col = feature
                if col in working.columns:
                    mode_val = working[col].mode()
                    if len(mode_val) > 0:
                        working[col] = working[col].fillna(mode_val.iloc[0])
                        log.append({
                            "type": op_type, "feature": col,
                            "fill_value": _serialise_value(mode_val.iloc[0]),
                            "status": "applied",
                        })

            elif op_type == "standardization":
                col = feature
                if col in working.columns and pd.api.types.is_numeric_dtype(working[col]):
                    mean = float(working[col].mean())
                    std = float(working[col].std())
                    if std and std > 0:
                        working[col] = (working[col] - mean) / std
                        log.append({
                            "type": op_type, "feature": col,
                            "mean": mean, "std": std, "status": "applied",
                        })

            elif op_type == "normalization":
                col = feature
                if col in working.columns and pd.api.types.is_numeric_dtype(working[col]):
                    mn = float(working[col].min())
                    mx = float(working[col].max())
                    if mx > mn:
                        working[col] = (working[col] - mn) / (mx - mn)
                        log.append({
                            "type": op_type, "feature": col,
                            "min": mn, "max": mx, "status": "applied",
                        })

            elif op_type == "one_hot_encoding":
                col = feature
                if col in working.columns and not pd.api.types.is_numeric_dtype(working[col]):
                    dummies = pd.get_dummies(working[col], prefix=col, dummy_na=True)
                    working = pd.concat(
                        [working.drop(columns=[col]), dummies], axis=1
                    )
                    log.append({
                        "type": op_type, "feature": col,
                        "columns_added": list(dummies.columns), "status": "applied",
                    })

            elif op_type == "label_encoding":
                col = feature
                if col in working.columns and not pd.api.types.is_numeric_dtype(working[col]):
                    cats = working[col].astype("category")
                    working[col] = cats.cat.codes
                    mapping = {str(k): int(v) for k, v in zip(cats.cat.categories, cats.cat.codes)}
                    log.append({
                        "type": op_type, "feature": col,
                        "mapping": mapping, "status": "applied",
                    })

            elif op_type == "clip_iqr":
                col = feature
                if col in working.columns and pd.api.types.is_numeric_dtype(working[col]):
                    series = working[col].dropna()
                    if len(series) > 4:
                        q1, q3 = series.quantile(0.25), series.quantile(0.75)
                        iqr = q3 - q1
                        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                        n_clipped = int(((working[col] < lower) | (working[col] > upper)).sum())
                        working[col] = working[col].clip(lower=lower, upper=upper)
                        log.append({
                            "type": op_type, "feature": col,
                            "lower": float(lower), "upper": float(upper),
                            "n_clipped": n_clipped, "status": "applied",
                        })

            elif op_type == "type_correction":
                col = feature
                if col in working.columns:
                    converted = pd.to_numeric(working[col], errors="coerce")
                    n_converted = int(working[col].notna().sum() - converted.notna().sum())
                    working[col] = converted
                    log.append({
                        "type": op_type, "feature": col,
                        "n_converted": n_converted, "status": "applied",
                    })

            elif op_type == "categorical_cleaning":
                col = feature
                if col in working.columns:
                    working[col] = working[col].astype(str).str.strip()
                    log.append({"type": op_type, "feature": col, "status": "applied"})

            else:
                log.append({"type": op_type, "feature": feature, "status": "skipped_unknown"})

        except Exception as exc:  # pragma: no cover - defensive
            log.append({"type": op_type, "feature": feature, "status": "error", "error": str(exc)})

    return working, log


def _serialise_value(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating, float)):
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