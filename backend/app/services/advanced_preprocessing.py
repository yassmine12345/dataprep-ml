"""Advanced Preprocessing Service.

Provides comprehensive preprocessing operations including:
- Missing value handling (multiple strategies)
- Encoding (One-Hot, Label, Target, Frequency, Ordinal)
- Scaling (Standard, MinMax, Robust, MaxAbs)
- Outlier handling (IQR clipping, Z-score clipping, removal, transformation)
- Date/time feature extraction
- Categorical cleaning
- Class balancing (SMOTE, RandomOver/Under sampling)
- Feature engineering
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.preprocessing import (
    StandardScaler,
    MinMaxScaler,
    RobustScaler,
    MaxAbsScaler,
    LabelEncoder,
    OrdinalEncoder,
)
from sklearn.impute import KNNImputer, SimpleImputer
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.impute import IterativeImputer

# Optional imbalanced-learn import
try:
    from imblearn.over_sampling import SMOTE, RandomOverSampler, SMOTENC
    from imblearn.under_sampling import RandomUnderSampler
    IMBALANCED_LEARN_AVAILABLE = True
except ImportError:
    IMBALANCED_LEARN_AVAILABLE = False


def apply_advanced_operations(
    df: pd.DataFrame,
    operations: list[dict[str, Any]],
    target: str | None = None,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """Apply a list of advanced preprocessing operations.

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
                _apply_drop_column(working, feature, log)

            elif op_type == "drop_rows_missing":
                _apply_drop_rows_missing(working, feature, params, log)

            elif op_type == "duplicate_removal":
                _apply_duplicate_removal(working, params, log)

            # Missing value imputation
            elif op_type == "median_imputation":
                _apply_imputation(working, feature, "median", log)
            elif op_type == "mean_imputation":
                _apply_imputation(working, feature, "mean", log)
            elif op_type == "mode_imputation":
                _apply_imputation(working, feature, "mode", log)
            elif op_type == "constant_imputation":
                _apply_imputation(working, feature, "constant", log, params.get("fill_value", "Unknown"))
            elif op_type == "knn_imputation":
                _apply_knn_imputation(working, feature, params, log)
            elif op_type == "iterative_imputation":
                _apply_iterative_imputation(working, feature, params, log)

            # Encoding
            elif op_type == "one_hot_encoding":
                _apply_one_hot_encoding(working, feature, params, log)
            elif op_type == "label_encoding":
                _apply_label_encoding(working, feature, log)
            elif op_type == "ordinal_encoding":
                _apply_ordinal_encoding(working, feature, params, log)
            elif op_type == "target_encoding":
                _apply_target_encoding(working, feature, target, params, log)
            elif op_type == "frequency_encoding":
                _apply_frequency_encoding(working, feature, log)

            # Scaling
            elif op_type == "standardization":
                _apply_scaling(working, feature, "standard", log)
            elif op_type == "normalization":
                _apply_scaling(working, feature, "minmax", log)
            elif op_type == "robust_scaling":
                _apply_scaling(working, feature, "robust", log)
            elif op_type == "maxabs_scaling":
                _apply_scaling(working, feature, "maxabs", log)

            # Outlier handling
            elif op_type == "clip_iqr":
                _apply_clip_iqr(working, feature, params, log)
            elif op_type == "clip_zscore":
                _apply_clip_zscore(working, feature, params, log)
            elif op_type == "remove_outliers":
                _apply_remove_outliers(working, feature, params, log)
            elif op_type == "log_transform":
                _apply_log_transform(working, feature, params, log)
            elif op_type == "sqrt_transform":
                _apply_sqrt_transform(working, feature, params, log)
            elif op_type == "boxcox_transform":
                _apply_boxcox_transform(working, feature, params, log)
            elif op_type == "yeojohnson_transform":
                _apply_yeojohnson_transform(working, feature, params, log)

            # Type correction
            elif op_type == "type_correction":
                _apply_type_correction(working, feature, params, log)

            # Categorical cleaning
            elif op_type == "categorical_cleaning":
                _apply_categorical_cleaning(working, feature, params, log)
            elif op_type == "group_rare_categories":
                _apply_group_rare_categories(working, feature, params, log)

            # Date/time parsing and feature extraction
            elif op_type == "parse_dates":
                _apply_parse_dates(working, feature, params, log)
            elif op_type == "extract_date_features":
                _apply_extract_date_features(working, feature, params, log)

            # Class balancing
            elif op_type == "smote":
                _apply_smote(working, target, params, log)
            elif op_type == "random_oversample":
                _apply_random_oversample(working, target, params, log)
            elif op_type == "random_undersample":
                _apply_random_undersample(working, target, params, log)
            elif op_type == "smotenc":
                _apply_smotenc(working, target, params, log)

            # Feature engineering
            elif op_type == "polynomial_features":
                _apply_polynomial_features(working, feature, params, log)
            elif op_type == "binning":
                _apply_binning(working, feature, params, log)

            # Clip negative values
            elif op_type == "clip_lower_zero":
                _apply_clip_lower_zero(working, feature, log)

            else:
                log.append({"type": op_type, "feature": feature, "status": "skipped_unknown"})

        except Exception as exc:
            log.append({"type": op_type, "feature": feature, "status": "error", "error": str(exc)})

    return working, log


# =============================================================================
# Column Operations
# =============================================================================

def _apply_drop_column(df: pd.DataFrame, feature: str, log: list) -> None:
    if feature in df.columns:
        df.drop(columns=[feature], inplace=True)
        log.append({"type": "drop_column", "feature": feature, "status": "applied"})


def _apply_drop_rows_missing(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    col = feature or params.get("column")
    if col in df.columns:
        before = len(df)
        df.dropna(subset=[col], inplace=True)
        log.append({
            "type": "drop_rows_missing", "feature": col,
            "rows_removed": before - len(df), "status": "applied",
        })


def _apply_duplicate_removal(df: pd.DataFrame, params: dict, log: list) -> None:
    keep = params.get("keep", "first")
    before = len(df)
    df.drop_duplicates(keep=keep, inplace=True)
    log.append({
        "type": "duplicate_removal",
        "rows_removed": before - len(df),
        "keep": keep,
        "status": "applied",
    })


# =============================================================================
# Missing Value Imputation
# =============================================================================

def _apply_imputation(df: pd.DataFrame, feature: str, strategy: str, log: list, fill_value=None) -> None:
    if feature not in df.columns:
        return

    if strategy in ("median", "mean") and not pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": f"{strategy}_imputation", "feature": feature, "status": "error", "error": "Column not numeric"})
        return

    if strategy == "constant" and fill_value is None:
        fill_value = "Unknown" if not pd.api.types.is_numeric_dtype(df[feature]) else 0

    imputer = SimpleImputer(strategy=strategy, fill_value=fill_value)
    df[feature] = imputer.fit_transform(df[[feature]]).ravel()
    log.append({
        "type": f"{strategy}_imputation", "feature": feature,
        "fill_value": _serialise_value(fill_value) if strategy == "constant" else _serialise_value(imputer.statistics_[0]),
        "status": "applied",
    })


def _apply_knn_imputation(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "knn_imputation", "feature": feature, "status": "error", "error": "Column not numeric or not found"})
        return

    n_neighbors = params.get("n_neighbors", 5)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if feature not in numeric_cols:
        log.append({"type": "knn_imputation", "feature": feature, "status": "error", "error": "Column not numeric"})
        return

    imputer = KNNImputer(n_neighbors=n_neighbors)
    df[numeric_cols] = imputer.fit_transform(df[numeric_cols])
    log.append({
        "type": "knn_imputation", "feature": feature,
        "n_neighbors": n_neighbors, "columns_imputed": numeric_cols, "status": "applied",
    })


def _apply_iterative_imputation(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "iterative_imputation", "feature": feature, "status": "error", "error": "Column not numeric or not found"})
        return

    max_iter = params.get("max_iter", 10)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    imputer = IterativeImputer(max_iter=max_iter, random_state=42)
    df[numeric_cols] = imputer.fit_transform(df[numeric_cols])
    log.append({
        "type": "iterative_imputation", "feature": feature,
        "max_iter": max_iter, "columns_imputed": numeric_cols, "status": "applied",
    })


# =============================================================================
# Encoding Operations
# =============================================================================

def _apply_one_hot_encoding(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "one_hot_encoding", "feature": feature, "status": "error", "error": "Column not categorical or not found"})
        return

    drop_first = params.get("drop_first", False)
    handle_unknown = params.get("handle_unknown", "ignore")
    max_categories = params.get("max_categories", 50)

    # Limit categories if too many
    n_unique = df[feature].nunique()
    if n_unique > max_categories:
        # Group rare categories first
        top_cats = df[feature].value_counts().head(max_categories - 1).index
        df[feature] = df[feature].where(df[feature].isin(top_cats), "Other")

    dummies = pd.get_dummies(df[feature], prefix=feature, dummy_na=True, drop_first=drop_first)
    df.drop(columns=[feature], inplace=True)
    df[dummies.columns] = dummies

    log.append({
        "type": "one_hot_encoding", "feature": feature,
        "columns_added": list(dummies.columns), "drop_first": drop_first, "status": "applied",
    })


def _apply_label_encoding(df: pd.DataFrame, feature: str, log: list) -> None:
    if feature not in df.columns or pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "label_encoding", "feature": feature, "status": "error", "error": "Column not categorical or not found"})
        return

    le = LabelEncoder()
    df[feature] = le.fit_transform(df[feature].astype(str))
    mapping = {str(k): int(v) for k, v in zip(le.classes_, le.transform(le.classes_))}
    log.append({
        "type": "label_encoding", "feature": feature,
        "mapping": mapping, "status": "applied",
    })


def _apply_ordinal_encoding(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "ordinal_encoding", "feature": feature, "status": "error", "error": "Column not categorical or not found"})
        return

    categories = params.get("categories")
    if categories is None:
        # Auto-detect order from value counts
        categories = [df[feature].value_counts().index.tolist()]

    encoder = OrdinalEncoder(categories=categories, handle_unknown="use_encoded_value", unknown_value=-1)
    df[feature] = encoder.fit_transform(df[[feature]]).ravel()
    log.append({
        "type": "ordinal_encoding", "feature": feature,
        "categories": categories, "status": "applied",
    })


def _apply_target_encoding(df: pd.DataFrame, feature: str, target: str | None, params: dict, log: list) -> None:
    if target is None or target not in df.columns:
        log.append({"type": "target_encoding", "feature": feature, "status": "error", "error": "Target column required and must exist"})
        return
    if feature not in df.columns or pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "target_encoding", "feature": feature, "status": "error", "error": "Feature not categorical or not found"})
        return
    if not pd.api.types.is_numeric_dtype(df[target]):
        log.append({"type": "target_encoding", "feature": feature, "status": "error", "error": "Target must be numeric for regression or binary for classification"})
        return

    smoothing = params.get("smoothing", 1.0)
    # Simple target encoding: mean target per category
    global_mean = df[target].mean()
    category_means = df.groupby(feature)[target].mean()
    category_counts = df.groupby(feature)[target].count()

    # Apply smoothing
    smoothed = (category_means * category_counts + global_mean * smoothing) / (category_counts + smoothing)
    mapping = smoothed.to_dict()
    df[feature] = df[feature].map(mapping).fillna(global_mean)

    log.append({
        "type": "target_encoding", "feature": feature,
        "target": target, "smoothing": smoothing, "mapping": {str(k): float(v) for k, v in mapping.items()}, "status": "applied",
    })


def _apply_frequency_encoding(df: pd.DataFrame, feature: str, log: list) -> None:
    if feature not in df.columns or pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": "frequency_encoding", "feature": feature, "status": "error", "error": "Column not categorical or not found"})
        return

    freq = df[feature].value_counts(normalize=True)
    df[feature] = df[feature].map(freq)
    log.append({
        "type": "frequency_encoding", "feature": feature,
        "mapping": {str(k): float(v) for k, v in freq.items()}, "status": "applied",
    })


# =============================================================================
# Scaling Operations
# =============================================================================

def _apply_scaling(df: pd.DataFrame, feature: str, scaler_type: str, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        log.append({"type": scaler_type, "feature": feature, "status": "error", "error": "Column not numeric or not found"})
        return

    series = df[feature].dropna()
    if len(series) == 0:
        log.append({"type": scaler_type, "feature": feature, "status": "error", "error": "No non-null values"})
        return

    scalers = {
        "standard": StandardScaler(),
        "minmax": MinMaxScaler(),
        "robust": RobustScaler(),
        "maxabs": MaxAbsScaler(),
    }
    scaler = scalers[scaler_type]

    values = df[[feature]].values
    transformed = scaler.fit_transform(values)
    df[feature] = transformed.ravel()

    params = {"scaler_type": scaler_type}
    if scaler_type == "standard":
        params.update({"mean": float(scaler.mean_[0]), "scale": float(scaler.scale_[0])})
    elif scaler_type == "minmax":
        params.update({"min": float(scaler.min_[0]), "scale": float(scaler.scale_[0])})
    elif scaler_type == "robust":
        params.update({"center": float(scaler.center_[0]), "scale": float(scaler.scale_[0])})
    elif scaler_type == "maxabs":
        params.update({"max_abs": float(scaler.max_abs_[0])})

    log.append({"type": scaler_type, "feature": feature, **params, "status": "applied"})


# =============================================================================
# Outlier Handling
# =============================================================================

def _apply_clip_iqr(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    factor = params.get("factor", 1.5)
    series = df[feature].dropna()
    if len(series) < 4:
        return

    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    lower, upper = q1 - factor * iqr, q3 + factor * iqr
    n_clipped = int(((df[feature] < lower) | (df[feature] > upper)).sum())
    df[feature] = df[feature].clip(lower=lower, upper=upper)

    log.append({
        "type": "clip_iqr", "feature": feature,
        "factor": factor, "lower": float(lower), "upper": float(upper),
        "n_clipped": n_clipped, "status": "applied",
    })


def _apply_clip_zscore(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    threshold = params.get("threshold", 3)
    series = df[feature].dropna()
    if len(series) < 2:
        return

    mean, std = series.mean(), series.std()
    if std == 0:
        return

    lower, upper = mean - threshold * std, mean + threshold * std
    n_clipped = int(((df[feature] < lower) | (df[feature] > upper)).sum())
    df[feature] = df[feature].clip(lower=lower, upper=upper)

    log.append({
        "type": "clip_zscore", "feature": feature,
        "threshold": threshold, "lower": float(lower), "upper": float(upper),
        "n_clipped": n_clipped, "status": "applied",
    })


def _apply_remove_outliers(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    method = params.get("method", "iqr")
    factor = params.get("factor", 1.5)
    threshold = params.get("threshold", 3)

    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    series = df[feature].dropna()
    if len(series) < 4:
        return

    if method == "iqr":
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - factor * iqr, q3 + factor * iqr
        mask = (df[feature] >= lower) & (df[feature] <= upper)
    else:  # zscore
        mean, std = series.mean(), series.std()
        if std == 0:
            return
        lower, upper = mean - threshold * std, mean + threshold * std
        mask = (df[feature] >= lower) & (df[feature] <= upper)

    before = len(df)
    df.drop(df[~mask].index, inplace=True)
    log.append({
        "type": "remove_outliers", "feature": feature,
        "method": method, "rows_removed": before - len(df), "status": "applied",
    })


def _apply_log_transform(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    shift = params.get("shift", 0)
    # Handle non-positive values
    min_val = df[feature].min()
    if min_val + shift <= 0:
        shift = abs(min_val) + 1

    df[feature] = np.log(df[feature] + shift)
    log.append({
        "type": "log_transform", "feature": feature,
        "shift": shift, "status": "applied",
    })


def _apply_sqrt_transform(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    shift = params.get("shift", 0)
    min_val = df[feature].min()
    if min_val + shift < 0:
        shift = abs(min_val)

    df[feature] = np.sqrt(df[feature] + shift)
    log.append({
        "type": "sqrt_transform", "feature": feature,
        "shift": shift, "status": "applied",
    })


def _apply_boxcox_transform(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    series = df[feature].dropna()
    if (series <= 0).any():
        log.append({"type": "boxcox_transform", "feature": feature, "status": "error", "error": "Box-Cox requires positive values"})
        return

    from scipy.stats import boxcox
    transformed, lambda_val = boxcox(series)
    df.loc[series.index, feature] = transformed
    log.append({
        "type": "boxcox_transform", "feature": feature,
        "lambda": float(lambda_val), "status": "applied",
    })


def _apply_yeojohnson_transform(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    from scipy.stats import yeojohnson
    series = df[feature].dropna()
    transformed, lambda_val = yeojohnson(series)
    df.loc[series.index, feature] = transformed
    log.append({
        "type": "yeojohnson_transform", "feature": feature,
        "lambda": float(lambda_val), "status": "applied",
    })


# =============================================================================
# Type Correction
# =============================================================================

def _apply_type_correction(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns:
        return

    strict = params.get("strict", False)
    try:
        if strict:
            converted = pd.to_numeric(df[feature], errors="raise")
        else:
            converted = pd.to_numeric(df[feature], errors="coerce")
        n_converted = int(df[feature].notna().sum() - converted.notna().sum())
        df[feature] = converted
        log.append({
            "type": "type_correction", "feature": feature,
            "n_converted": n_converted, "strict": strict, "status": "applied",
        })
    except Exception as exc:
        log.append({"type": "type_correction", "feature": feature, "status": "error", "error": str(exc)})


# =============================================================================
# Categorical Cleaning
# =============================================================================

def _apply_categorical_cleaning(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns:
        return

    case = params.get("case", "strip")  # strip, lower, upper, title
    original_unique = df[feature].nunique()

    if case == "strip":
        df[feature] = df[feature].astype(str).str.strip()
    elif case == "lower":
        df[feature] = df[feature].astype(str).str.strip().str.lower()
    elif case == "upper":
        df[feature] = df[feature].astype(str).str.strip().str.upper()
    elif case == "title":
        df[feature] = df[feature].astype(str).str.strip().str.title()

    new_unique = df[feature].nunique()
    log.append({
        "type": "categorical_cleaning", "feature": feature,
        "case": case, "unique_before": original_unique, "unique_after": new_unique, "status": "applied",
    })


def _apply_group_rare_categories(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or pd.api.types.is_numeric_dtype(df[feature]):
        return

    threshold = params.get("threshold", 0.01)  # Categories with < 1% frequency
    other_label = params.get("other_label", "Other")

    freq = df[feature].value_counts(normalize=True)
    rare_cats = freq[freq < threshold].index
    if len(rare_cats) > 0:
        df[feature] = df[feature].replace(rare_cats, other_label)
        log.append({
            "type": "group_rare_categories", "feature": feature,
            "threshold": threshold, "rare_categories": list(rare_cats),
            "other_label": other_label, "categories_grouped": len(rare_cats), "status": "applied",
        })


# =============================================================================
# Date/Time Operations
# =============================================================================

def _apply_parse_dates(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns:
        return

    format_str = params.get("format")
    errors = params.get("errors", "coerce")

    try:
        if format_str:
            df[feature] = pd.to_datetime(df[feature], format=format_str, errors=errors)
        else:
            df[feature] = pd.to_datetime(df[feature], errors=errors, infer_datetime_format=True)

        n_parsed = int(df[feature].notna().sum())
        log.append({
            "type": "parse_dates", "feature": feature,
            "format": format_str, "n_parsed": n_parsed, "status": "applied",
        })
    except Exception as exc:
        log.append({"type": "parse_dates", "feature": feature, "status": "error", "error": str(exc)})


def _apply_extract_date_features(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_datetime64_any_dtype(df[feature]):
        log.append({"type": "extract_date_features", "feature": feature, "status": "error", "error": "Column not datetime"})
        return

    components = params.get("components", ["year", "month", "day", "weekday"])
    drop_original = params.get("drop_original", False)

    new_columns = []
    for comp in components:
        new_col = f"{feature}_{comp}"
        if comp == "year":
            df[new_col] = df[feature].dt.year
        elif comp == "month":
            df[new_col] = df[feature].dt.month
        elif comp == "day":
            df[new_col] = df[feature].dt.day
        elif comp == "weekday":
            df[new_col] = df[feature].dt.weekday
        elif comp == "hour":
            df[new_col] = df[feature].dt.hour
        elif comp == "quarter":
            df[new_col] = df[feature].dt.quarter
        elif comp == "dayofyear":
            df[new_col] = df[feature].dt.dayofyear
        elif comp == "weekofyear":
            df[new_col] = df[feature].dt.isocalendar().week
        elif comp == "is_weekend":
            df[new_col] = (df[feature].dt.weekday >= 5).astype(int)
        new_columns.append(new_col)

    if drop_original:
        df.drop(columns=[feature], inplace=True)

    log.append({
        "type": "extract_date_features", "feature": feature,
        "components": components, "new_columns": new_columns, "status": "applied",
    })


# =============================================================================
# Class Balancing
# =============================================================================

def _apply_smote(df: pd.DataFrame, target: str | None, params: dict, log: list) -> None:
    if not IMBALANCED_LEARN_AVAILABLE:
        log.append({"type": "smote", "feature": target, "status": "error", "error": "imbalanced-learn not installed"})
        return

    if target is None or target not in df.columns:
        log.append({"type": "smote", "feature": target, "status": "error", "error": "Target column required"})
        return

    # Prepare features and target
    X = df.drop(columns=[target])
    y = df[target]

    # Only use numeric features for SMOTE
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        log.append({"type": "smote", "feature": target, "status": "error", "error": "No numeric features for SMOTE"})
        return

    X_numeric = X[numeric_cols]

    # Handle missing values
    if X_numeric.isna().any().any():
        X_numeric = X_numeric.fillna(X_numeric.median())

    sampling_strategy = params.get("sampling_strategy", "auto")
    k_neighbors = params.get("k_neighbors", 5)
    random_state = params.get("random_state", 42)

    try:
        smote = SMOTE(sampling_strategy=sampling_strategy, k_neighbors=k_neighbors, random_state=random_state)
        X_resampled, y_resampled = smote.fit_resample(X_numeric, y)

        # Create new dataframe with resampled data
        # For non-numeric columns, we can't easily interpolate, so we drop them or use mode
        non_numeric_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()
        if non_numeric_cols:
            # Use mode for categorical columns from original data
            mode_values = X[non_numeric_cols].mode().iloc[0] if len(X) > 0 else {}
            # This is a limitation - SMOTE only works on numeric features
            pass

        resampled_df = pd.DataFrame(X_resampled, columns=numeric_cols)
        resampled_df[target] = y_resampled

        # Copy non-numeric columns from original (using mode) - limited approach
        for col in non_numeric_cols:
            resampled_df[col] = X[col].mode().iloc[0] if len(X[col].mode()) > 0 else np.nan

        # Replace the working dataframe
        df.drop(df.index, inplace=True)
        for col in resampled_df.columns:
            df[col] = resampled_df[col]

        log.append({
            "type": "smote", "feature": target,
            "sampling_strategy": sampling_strategy, "k_neighbors": k_neighbors,
            "original_samples": len(y), "resampled_samples": len(y_resampled),
            "class_distribution_before": y.value_counts().to_dict(),
            "class_distribution_after": y_resampled.value_counts().to_dict(),
            "status": "applied",
            "warning": "SMOTE applied to entire dataset. For proper ML, apply only to training set after train/test split to avoid data leakage."
        })
    except Exception as exc:
        log.append({"type": "smote", "feature": target, "status": "error", "error": str(exc)})


def _apply_random_oversample(df: pd.DataFrame, target: str | None, params: dict, log: list) -> None:
    if not IMBALANCED_LEARN_AVAILABLE:
        log.append({"type": "random_oversample", "feature": target, "status": "error", "error": "imbalanced-learn not installed"})
        return

    if target is None or target not in df.columns:
        log.append({"type": "random_oversample", "feature": target, "status": "error", "error": "Target column required"})
        return

    X = df.drop(columns=[target])
    y = df[target]
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()

    if not numeric_cols:
        log.append({"type": "random_oversample", "feature": target, "status": "error", "error": "No numeric features"})
        return

    X_numeric = X[numeric_cols].fillna(X[numeric_cols].median())

    sampling_strategy = params.get("sampling_strategy", "auto")
    random_state = params.get("random_state", 42)

    try:
        ros = RandomOverSampler(sampling_strategy=sampling_strategy, random_state=random_state)
        X_resampled, y_resampled = ros.fit_resample(X_numeric, y)

        resampled_df = pd.DataFrame(X_resampled, columns=numeric_cols)
        resampled_df[target] = y_resampled

        non_numeric_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()
        for col in non_numeric_cols:
            resampled_df[col] = X[col].mode().iloc[0] if len(X[col].mode()) > 0 else np.nan

        df.drop(df.index, inplace=True)
        for col in resampled_df.columns:
            df[col] = resampled_df[col]

        log.append({
            "type": "random_oversample", "feature": target,
            "original_samples": len(y), "resampled_samples": len(y_resampled),
            "class_distribution_before": y.value_counts().to_dict(),
            "class_distribution_after": y_resampled.value_counts().to_dict(),
            "status": "applied",
        })
    except Exception as exc:
        log.append({"type": "random_oversample", "feature": target, "status": "error", "error": str(exc)})


def _apply_random_undersample(df: pd.DataFrame, target: str | None, params: dict, log: list) -> None:
    if not IMBALANCED_LEARN_AVAILABLE:
        log.append({"type": "random_undersample", "feature": target, "status": "error", "error": "imbalanced-learn not installed"})
        return

    if target is None or target not in df.columns:
        log.append({"type": "random_undersample", "feature": target, "status": "error", "error": "Target column required"})
        return

    X = df.drop(columns=[target])
    y = df[target]
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()

    if not numeric_cols:
        log.append({"type": "random_undersample", "feature": target, "status": "error", "error": "No numeric features"})
        return

    X_numeric = X[numeric_cols].fillna(X[numeric_cols].median())

    sampling_strategy = params.get("sampling_strategy", "auto")
    random_state = params.get("random_state", 42)

    try:
        rus = RandomUnderSampler(sampling_strategy=sampling_strategy, random_state=random_state)
        X_resampled, y_resampled = rus.fit_resample(X_numeric, y)

        resampled_df = pd.DataFrame(X_resampled, columns=numeric_cols)
        resampled_df[target] = y_resampled

        non_numeric_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()
        for col in non_numeric_cols:
            resampled_df[col] = X[col].mode().iloc[0] if len(X[col].mode()) > 0 else np.nan

        df.drop(df.index, inplace=True)
        for col in resampled_df.columns:
            df[col] = resampled_df[col]

        log.append({
            "type": "random_undersample", "feature": target,
            "original_samples": len(y), "resampled_samples": len(y_resampled),
            "class_distribution_before": y.value_counts().to_dict(),
            "class_distribution_after": y_resampled.value_counts().to_dict(),
            "status": "applied",
        })
    except Exception as exc:
        log.append({"type": "random_undersample", "feature": target, "status": "error", "error": str(exc)})


def _apply_smotenc(df: pd.DataFrame, target: str | None, params: dict, log: list) -> None:
    if not IMBALANCED_LEARN_AVAILABLE:
        log.append({"type": "smotenc", "feature": target, "status": "error", "error": "imbalanced-learn not installed"})
        return

    if target is None or target not in df.columns:
        log.append({"type": "smotenc", "feature": target, "status": "error", "error": "Target column required"})
        return

    X = df.drop(columns=[target])
    y = df[target]

    # Identify categorical columns
    categorical_features = []
    for i, col in enumerate(X.columns):
        if not pd.api.types.is_numeric_dtype(X[col]):
            categorical_features.append(i)

    if not categorical_features:
        log.append({"type": "smotenc", "feature": target, "status": "error", "error": "No categorical features for SMOTE-NC"})
        return

    # Encode categorical features for SMOTE-NC
    X_encoded = X.copy()
    for col in X.select_dtypes(exclude=[np.number]).columns:
        X_encoded[col] = LabelEncoder().fit_transform(X_encoded[col].astype(str))

    # Handle missing values
    X_encoded = X_encoded.fillna(X_encoded.median(numeric_only=True))

    sampling_strategy = params.get("sampling_strategy", "auto")
    k_neighbors = params.get("k_neighbors", 5)
    random_state = params.get("random_state", 42)

    try:
        smotenc = SMOTENC(categorical_features=categorical_features, sampling_strategy=sampling_strategy,
                          k_neighbors=k_neighbors, random_state=random_state)
        X_resampled, y_resampled = smotenc.fit_resample(X_encoded, y)

        # Reconstruct dataframe
        resampled_df = pd.DataFrame(X_resampled, columns=X.columns)
        resampled_df[target] = y_resampled

        df.drop(df.index, inplace=True)
        for col in resampled_df.columns:
            df[col] = resampled_df[col]

        log.append({
            "type": "smotenc", "feature": target,
            "categorical_features": [X.columns[i] for i in categorical_features],
            "original_samples": len(y), "resampled_samples": len(y_resampled),
            "class_distribution_before": y.value_counts().to_dict(),
            "class_distribution_after": y_resampled.value_counts().to_dict(),
            "status": "applied",
            "warning": "SMOTE-NC applied to entire dataset. For proper ML, apply only to training set after train/test split to avoid data leakage."
        })
    except Exception as exc:
        log.append({"type": "smotenc", "feature": target, "status": "error", "error": str(exc)})


# =============================================================================
# Feature Engineering
# =============================================================================

def _apply_polynomial_features(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    degree = params.get("degree", 2)
    interaction_only = params.get("interaction_only", False)

    from sklearn.preprocessing import PolynomialFeatures
    poly = PolynomialFeatures(degree=degree, interaction_only=interaction_only, include_bias=False)

    # Only apply to selected numeric columns
    numeric_cols = params.get("columns", [feature])
    numeric_cols = [c for c in numeric_cols if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]

    if len(numeric_cols) < 1:
        return

    X_poly = poly.fit_transform(df[numeric_cols])
    feature_names = poly.get_feature_names_out(numeric_cols)

    # Drop original columns and add polynomial features
    for col in numeric_cols:
        if col in df.columns:
            df.drop(columns=[col], inplace=True)

    for i, name in enumerate(feature_names):
        df[name] = X_poly[:, i]

    log.append({
        "type": "polynomial_features", "features": numeric_cols,
        "degree": degree, "new_features": list(feature_names), "status": "applied",
    })


def _apply_binning(df: pd.DataFrame, feature: str, params: dict, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    n_bins = params.get("n_bins", 5)
    strategy = params.get("strategy", "quantile")  # uniform, quantile, kmeans
    encode = params.get("encode", "ordinal")  # ordinal, onehot

    from sklearn.preprocessing import KBinsDiscretizer
    discretizer = KBinsDiscretizer(n_bins=n_bins, encode=encode, strategy=strategy, random_state=42)

    values = df[[feature]].values
    binned = discretizer.fit_transform(values)

    if encode == "onehot":
        feature_names = [f"{feature}_bin_{i}" for i in range(n_bins)]
        df.drop(columns=[feature], inplace=True)
        for i, name in enumerate(feature_names):
            df[name] = binned[:, i]
        new_cols = feature_names
    else:
        new_col = f"{feature}_binned"
        df[new_col] = binned.ravel()
        new_cols = [new_col]

    log.append({
        "type": "binning", "feature": feature,
        "n_bins": n_bins, "strategy": strategy, "new_columns": new_cols, "status": "applied",
    })


def _apply_clip_lower_zero(df: pd.DataFrame, feature: str, log: list) -> None:
    if feature not in df.columns or not pd.api.types.is_numeric_dtype(df[feature]):
        return

    n_clipped = int((df[feature] < 0).sum())
    if n_clipped > 0:
        df[feature] = df[feature].clip(lower=0)
        log.append({
            "type": "clip_lower_zero", "feature": feature,
            "n_clipped": n_clipped, "status": "applied",
        })


def _serialise_value(val: Any) -> Any:
    if val is None or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
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