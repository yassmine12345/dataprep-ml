"""Comprehensive Data Quality Analysis Service.

This module provides advanced data quality detection with proper logic
to avoid false positives (e.g., not flagging normal repeated values as errors).
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats


def analyze_data_quality(df: pd.DataFrame, target: str | None = None) -> dict[str, Any]:
    """Perform comprehensive data quality analysis on the dataset.

    Returns structured issues with severity, explanations, and actionable recommendations.
    """
    n_rows, n_cols = df.shape
    issues: list[dict[str, Any]] = []

    # 1. Missing Values Analysis
    issues.extend(_detect_missing_values(df, target))

    # 2. Actual Duplicate Rows (full row duplicates)
    issues.extend(_detect_duplicate_rows(df))

    # 3. Potential Identifier Columns (high cardinality, unique-like)
    issues.extend(_detect_identifier_columns(df, target))

    # 4. Constant / Near-Constant Columns
    issues.extend(_detect_constant_columns(df, target))

    # 5. Data Type Issues
    issues.extend(_detect_type_issues(df))

    # 6. Numeric Outliers (IQR and Z-score)
    issues.extend(_detect_numeric_outliers(df, target))

    # 7. Categorical Issues
    issues.extend(_detect_categorical_issues(df))

    # 8. Date/Time Parsing Issues
    issues.extend(_detect_date_issues(df))

    # 9. Target Class Imbalance (if supervised)
    if target and target in df.columns:
        issues.extend(_detect_class_imbalance(df, target))

    # 10. Leading/Trailing Whitespace
    issues.extend(_detect_whitespace_issues(df))

    # 11. Suspicious Values (negative values where not expected, etc.)
    issues.extend(_detect_suspicious_values(df))

    # Calculate overall quality score
    quality_score = _calculate_quality_score(df, issues)

    # Group issues by category and severity
    issues_by_category = _group_issues_by_category(issues)
    issues_by_severity = _group_issues_by_severity(issues)

    return {
        "quality_score": quality_score,
        "total_issues": len(issues),
        "issues": issues,
        "issues_by_category": issues_by_category,
        "issues_by_severity": issues_by_severity,
        "summary": _generate_summary(df, issues),
    }


def _detect_missing_values(df: pd.DataFrame, target: str | None) -> list[dict[str, Any]]:
    """Detect missing values per column with severity based on percentage."""
    issues = []
    n_rows = len(df)

    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        if n_missing == 0:
            continue

        pct = 100.0 * n_missing / n_rows
        is_target = target is not None and col == target

        if pct > 50:
            severity = "critical"
            recommendation = "drop_column"
            impact = "High - column is mostly empty"
        elif pct > 20:
            severity = "high"
            recommendation = "drop_column" if not is_target else "advanced_imputation"
            impact = "High - significant data loss if dropped"
        elif pct > 5:
            severity = "medium"
            recommendation = "median_imputation" if pd.api.types.is_numeric_dtype(df[col]) else "mode_imputation"
            impact = "Medium - imputation recommended"
        else:
            severity = "low"
            recommendation = "median_imputation" if pd.api.types.is_numeric_dtype(df[col]) else "mode_imputation"
            impact = "Low - minimal impact"

        issues.append({
            "id": f"missing_{col}",
            "category": "missing_values",
            "title": f"Missing Values in '{col}'",
            "severity": severity,
            "columns": [col],
            "affected_count": n_missing,
            "affected_percentage": round(pct, 2),
            "description": f"Column '{col}' has {n_missing} missing values ({pct:.2f}% of rows).",
            "explanation": _explain_missing_values(pct, is_target),
            "recommendation": recommendation,
            "alternative_actions": _get_missing_alternatives(pct, pd.api.types.is_numeric_dtype(df[col]), is_target),
            "expected_impact": impact,
            "example_values": _get_missing_examples(df, col),
        })

    return issues


def _detect_duplicate_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect actual duplicate rows (entire row duplicates), not column value repetitions."""
    n_rows = len(df)
    dup_mask = df.duplicated(keep=False)
    n_duplicates = int(dup_mask.sum())

    if n_duplicates == 0:
        return []

    # Get example duplicate rows
    dup_rows = df[dup_mask].head(5)
    examples = dup_rows.to_dict("records")

    pct = 100.0 * n_duplicates / n_rows
    severity = "high" if pct > 10 else "medium" if pct > 1 else "low"

    return [{
        "id": "duplicate_rows",
        "category": "duplicates",
        "title": "Duplicate Rows Detected",
        "severity": severity,
        "columns": ["__all__"],
        "affected_count": n_duplicates,
        "affected_percentage": round(pct, 2),
        "description": f"{n_duplicates} rows are exact duplicates of other rows ({pct:.2f}% of dataset).",
        "explanation": "These are complete row duplicates where all column values match. "
                       "This often indicates data collection errors or repeated logging.",
        "recommendation": "duplicate_removal",
        "alternative_actions": [
            {"action": "duplicate_removal", "label": "Remove duplicate rows (keep first)"},
            {"action": "duplicate_removal_last", "label": "Remove duplicate rows (keep last)"},
            {"action": "inspect", "label": "Inspect duplicate rows before deciding"},
        ],
        "expected_impact": f"Will reduce dataset by {n_duplicates} rows",
        "example_values": examples,
    }]


def _detect_identifier_columns(df: pd.DataFrame, target: str | None) -> list[dict[str, Any]]:
    """Detect columns that are likely identifiers (high cardinality, unique values)."""
    issues = []
    n_rows = len(df)

    for col in df.columns:
        if target and col == target:
            continue

        n_unique = df[col].nunique(dropna=True)
        n_missing = int(df[col].isna().sum())
        unique_ratio = n_unique / max(1, n_rows - n_missing)

        # Likely identifier if: very high cardinality (>95% unique) and not numeric continuous
        if unique_ratio > 0.95 and n_unique > 20:
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            # Additional check: if numeric, check if it looks like an ID (sequential, high values)
            looks_like_id = False
            if is_numeric:
                series = df[col].dropna()
                if len(series) > 10:
                    # Check if values are mostly integers and sequential-ish
                    diffs = series.sort_values().diff().dropna()
                    if (diffs == 1).mean() > 0.5 or (diffs <= 10).mean() > 0.8:
                        looks_like_id = True
            else:
                looks_like_id = True

            if looks_like_id:
                issues.append({
                    "id": f"identifier_{col}",
                    "category": "identifier_columns",
                    "title": f"Potential Identifier Column: '{col}'",
                    "severity": "info",
                    "columns": [col],
                    "affected_count": n_unique,
                    "affected_percentage": round(100.0 * unique_ratio, 2),
                    "description": f"Column '{col}' has {n_unique} unique values ({unique_ratio*100:.1f}% unique). "
                                   f"Likely an identifier column (ID, key, etc.).",
                    "explanation": "Identifier columns should typically be excluded from ML training "
                                   "as they don't carry predictive information and can cause overfitting.",
                    "recommendation": "drop_column",
                    "alternative_actions": [
                        {"action": "drop_column", "label": "Drop column (recommended for ML)"},
                        {"action": "keep", "label": "Keep column (may be needed for joins)"},
                        {"action": "mark_as_id", "label": "Mark as identifier (exclude from preprocessing)"},
                    ],
                    "expected_impact": "Removes a non-predictive feature from ML pipeline",
                    "example_values": df[col].dropna().head(10).tolist(),
                })

    return issues


def _detect_constant_columns(df: pd.DataFrame, target: str | None) -> list[dict[str, Any]]:
    """Detect constant and near-constant columns."""
    issues = []
    n_rows = len(df)

    for col in df.columns:
        if target and col == target:
            continue

        n_unique = df[col].nunique(dropna=True)
        n_missing = int(df[col].isna().sum())

        if n_unique == 1 and n_missing == 0:
            # Truly constant
            val = df[col].dropna().iloc[0]
            issues.append({
                "id": f"constant_{col}",
                "category": "constant_columns",
                "title": f"Constant Column: '{col}'",
                "severity": "high",
                "columns": [col],
                "affected_count": n_rows,
                "affected_percentage": 100.0,
                "description": f"Column '{col}' has the same value ({val}) for all {n_rows} rows.",
                "explanation": "Constant columns provide no information for ML models and should be removed.",
                "recommendation": "drop_column",
                "alternative_actions": [
                    {"action": "drop_column", "label": "Drop column"},
                    {"action": "keep", "label": "Keep (may have business meaning)"},
                ],
                "expected_impact": "Removes non-informative feature",
                "example_values": [val],
            })
        elif n_unique <= 2 and n_missing == 0 and n_rows > 100:
            # Near-constant (binary with extreme imbalance)
            value_counts = df[col].value_counts()
            dominant_pct = 100.0 * value_counts.iloc[0] / n_rows
            if dominant_pct > 99:
                issues.append({
                    "id": f"near_constant_{col}",
                    "category": "constant_columns",
                    "title": f"Near-Constant Column: '{col}'",
                    "severity": "medium",
                    "columns": [col],
                    "affected_count": int(value_counts.iloc[0]),
                    "affected_percentage": round(dominant_pct, 2),
                    "description": f"Column '{col}' has {n_unique} unique values but one value "
                                   f"dominates ({dominant_pct:.1f}%).",
                    "explanation": "Near-constant columns provide very little information and may cause issues in ML.",
                    "recommendation": "drop_column",
                    "alternative_actions": [
                        {"action": "drop_column", "label": "Drop column"},
                        {"action": "keep", "label": "Keep for domain reasons"},
                    ],
                    "expected_impact": "Removes low-variance feature",
                    "example_values": value_counts.head(5).to_dict(),
                })

    return issues


def _detect_type_issues(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect columns with incorrect data types (e.g., numbers stored as strings)."""
    issues = []

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            continue

        series = df[col].dropna().astype(str).str.strip()
        if len(series) == 0:
            continue

        # Check if values look numeric
        numeric_pattern = series.str.match(r"^-?\d+(\.\d+)?$")
        numeric_ratio = numeric_pattern.mean()

        if numeric_ratio > 0.8:
            # Check if it could be dates
            date_pattern = series.str.match(r"^\d{4}-\d{2}-\d{2}")
            if date_pattern.mean() > 0.5:
                continue  # Likely dates, handled separately

            n_numeric = int(numeric_pattern.sum())
            pct = 100.0 * numeric_ratio

            issues.append({
                "id": f"type_issue_{col}",
                "category": "type_issues",
                "title": f"Numeric Data Stored as Text: '{col}'",
                "severity": "medium",
                "columns": [col],
                "affected_count": n_numeric,
                "affected_percentage": round(pct, 2),
                "description": f"{n_numeric} values ({pct:.1f}%) in '{col}' look numeric but column is {df[col].dtype}.",
                "explanation": "Numeric data stored as strings prevents proper numerical analysis and ML operations.",
                "recommendation": "type_correction",
                "alternative_actions": [
                    {"action": "type_correction", "label": "Convert to numeric (coerce errors to NaN)"},
                    {"action": "type_correction_strict", "label": "Convert to numeric (strict)"},
                    {"action": "keep", "label": "Keep as text (may have leading zeros, codes)"},
                ],
                "expected_impact": "Enables numerical operations and ML on this column",
                "example_values": series[~numeric_pattern].head(5).tolist() if (~numeric_pattern).any() else series.head(5).tolist(),
            })

    return issues


def _detect_numeric_outliers(df: pd.DataFrame, target: str | None) -> list[dict[str, Any]]:
    """Detect numeric outliers using IQR and Z-score methods."""
    issues = []

    for col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue
        if target and col == target:
            continue

        series = df[col].dropna()
        if len(series) < 10:
            continue

        # IQR method
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        iqr_lower, iqr_upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        iqr_outliers = series[(series < iqr_lower) | (series > iqr_upper)]
        n_iqr_out = len(iqr_outliers)

        # Z-score method (for comparison)
        z_scores = np.abs(stats.zscore(series))
        z_outliers = series[z_scores > 3]
        n_z_out = len(z_outliers)

        # Use IQR as primary, but note Z-score agreement
        n_outliers = n_iqr_out
        pct = 100.0 * n_outliers / len(series)

        if n_outliers == 0:
            continue

        severity = "high" if pct > 10 else "medium" if pct > 5 else "low"

        # Get example outlier values
        examples = iqr_outliers.head(10).tolist()

        issues.append({
            "id": f"outliers_{col}",
            "category": "outliers",
            "title": f"Outliers Detected in '{col}' (IQR Method)",
            "severity": severity,
            "columns": [col],
            "affected_count": n_outliers,
            "affected_percentage": round(pct, 2),
            "description": f"{n_outliers} values ({pct:.2f}%) lie outside IQR bounds "
                           f"[{iqr_lower:.2f}, {iqr_upper:.2f}]. Z-score (>3) detects {n_z_out} outliers.",
            "explanation": "Outliers can skew model training, especially for linear models and distance-based algorithms. "
                           "IQR method is robust to non-normal distributions.",
            "recommendation": "clip_iqr" if pct < 20 else "inspect_then_decide",
            "alternative_actions": [
                {"action": "clip_iqr", "label": "Clip/Winsorize using IQR bounds"},
                {"action": "clip_zscore", "label": "Clip using Z-score (>3)"},
                {"action": "remove_outliers", "label": "Remove outlier rows"},
                {"action": "log_transform", "label": "Apply log transformation"},
                {"action": "inspect", "label": "Inspect outliers before deciding"},
            ],
            "expected_impact": f"Reduces influence of {n_outliers} extreme values",
            "example_values": examples,
            "details": {
                "iqr_lower": round(float(iqr_lower), 4),
                "iqr_upper": round(float(iqr_upper), 4),
                "z_score_outliers": n_z_out,
            },
        })

    return issues


def _detect_categorical_issues(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect categorical data quality issues."""
    issues = []

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            continue

        series = df[col].dropna()
        if len(series) == 0:
            continue

        # Inconsistent casing/whitespace
        str_series = series.astype(str)
        stripped = str_series.str.strip()
        lower_stripped = stripped.str.lower()

        n_whitespace = int((str_series != stripped).sum())
        # Case differences: stripped != lower_stripped means there's a case difference
        n_case = int((stripped != lower_stripped).sum())
        # Actually: values that differ only by case after stripping
        n_case_only = int(((stripped.str.lower() == lower_stripped) & (stripped != lower_stripped)).sum())

        if n_whitespace > 0 or n_case_only > 0:
            total_issues = n_whitespace + n_case_only
            pct = 100.0 * total_issues / len(df)

            issues.append({
                "id": f"categorical_clean_{col}",
                "category": "categorical_issues",
                "title": f"Inconsistent Categorical Formatting: '{col}'",
                "severity": "medium" if pct > 5 else "low",
                "columns": [col],
                "affected_count": total_issues,
                "affected_percentage": round(pct, 2),
                "description": f"{total_issues} values ({pct:.2f}%) have leading/trailing whitespace "
                               f"or inconsistent casing.",
                "explanation": "Inconsistent formatting creates artificial categories (e.g., 'Yes', 'yes', ' YES ').",
                "recommendation": "categorical_cleaning",
                "alternative_actions": [
                    {"action": "categorical_cleaning", "label": "Clean: strip whitespace, normalize case"},
                    {"action": "categorical_cleaning_lower", "label": "Clean and convert to lowercase"},
                    {"action": "categorical_cleaning_title", "label": "Clean and convert to Title Case"},
                    {"action": "keep", "label": "Keep as-is"},
                ],
                "expected_impact": f"Consolidates {series.nunique()} categories into fewer clean ones",
                "example_values": _get_categorical_examples(series, stripped, lower_stripped),
            })

        # Too many categories (high cardinality categorical)
        n_unique = series.nunique()
        if n_unique > 50 and n_unique / len(series) > 0.1:
            issues.append({
                "id": f"high_cardinality_{col}",
                "category": "categorical_issues",
                "title": f"High Cardinality Categorical: '{col}'",
                "severity": "medium",
                "columns": [col],
                "affected_count": n_unique,
                "affected_percentage": round(100.0 * n_unique / len(series), 2),
                "description": f"Column '{col}' has {n_unique} unique categories ({n_unique/len(series)*100:.1f}% of rows).",
                "explanation": "High cardinality categorical features can cause overfitting and computational issues. "
                               "Consider target encoding, feature hashing, or grouping rare categories.",
                "recommendation": "target_encoding",
                "alternative_actions": [
                    {"action": "target_encoding", "label": "Target encoding (requires target)"},
                    {"action": "frequency_encoding", "label": "Frequency encoding"},
                    {"action": "group_rare", "label": "Group rare categories into 'Other'"},
                    {"action": "one_hot_encoding", "label": "One-hot encoding (may create many columns)"},
                    {"action": "drop_column", "label": "Drop column"},
                ],
                "expected_impact": "Reduces dimensionality or enables ML on this feature",
                "example_values": series.value_counts().head(10).to_dict(),
            })

    return issues


def _detect_date_issues(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect columns that could be parsed as dates but aren't."""
    issues = []

    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            continue

        series = df[col].dropna().astype(str).str.strip()
        if len(series) == 0:
            continue

        # Try to parse as dates
        try:
            parsed = pd.to_datetime(series, errors="coerce", infer_datetime_format=True)
            success_rate = parsed.notna().mean()

            if success_rate > 0.7:
                n_parsable = int(parsed.notna().sum())
                pct = 100.0 * success_rate

                issues.append({
                    "id": f"date_parsing_{col}",
                    "category": "date_issues",
                    "title": f"Date Column Not Parsed: '{col}'",
                    "severity": "medium",
                    "columns": [col],
                    "affected_count": n_parsable,
                    "affected_percentage": round(pct, 2),
                    "description": f"{n_parsable} values ({pct:.1f}%) in '{col}' can be parsed as dates.",
                    "explanation": "Date columns should be parsed to enable temporal feature extraction "
                                   "(year, month, day, weekday, etc.).",
                    "recommendation": "parse_dates",
                    "alternative_actions": [
                        {"action": "parse_dates", "label": "Parse as datetime"},
                        {"action": "parse_dates_extract", "label": "Parse and extract date features"},
                        {"action": "keep", "label": "Keep as text"},
                    ],
                    "expected_impact": "Enables temporal feature engineering",
                    "example_values": series.head(10).tolist(),
                    "details": {
                        "parsed_min": str(parsed.min()) if parsed.notna().any() else None,
                        "parsed_max": str(parsed.max()) if parsed.notna().any() else None,
                    },
                })
        except Exception:
            pass

    return issues


def _detect_class_imbalance(df: pd.DataFrame, target: str) -> list[dict[str, Any]]:
    """Detect class imbalance in target column."""
    issues = []
    series = df[target].dropna()

    if len(series) == 0:
        return issues

    value_counts = series.value_counts()
    n_classes = len(value_counts)

    if n_classes < 2:
        return issues

    # Calculate imbalance ratio
    max_count = value_counts.iloc[0]
    min_count = value_counts.iloc[-1]
    imbalance_ratio = max_count / max(1, min_count)

    # Only flag if significant imbalance
    if imbalance_ratio > 3:
        severity = "critical" if imbalance_ratio > 20 else "high" if imbalance_ratio > 10 else "medium"

        issues.append({
            "id": f"class_imbalance_{target}",
            "category": "class_imbalance",
            "title": f"Class Imbalance in Target '{target}'",
            "severity": severity,
            "columns": [target],
            "affected_count": int(min_count),
            "affected_percentage": round(100.0 * min_count / len(series), 2),
            "description": f"Target '{target}' has {n_classes} classes with imbalance ratio "
                           f"{imbalance_ratio:.1f}:1 (majority: {max_count}, minority: {min_count}).",
            "explanation": "Class imbalance can cause models to be biased towards the majority class. "
                           "Consider resampling (SMOTE, undersampling) or class weights.",
            "recommendation": "smote" if n_classes == 2 else "smote_or_weights",
            "alternative_actions": [
                {"action": "smote", "label": "SMOTE oversampling (synthetic minority samples)"},
                {"action": "random_oversample", "label": "Random oversampling"},
                {"action": "random_undersample", "label": "Random undersampling"},
                {"action": "class_weights", "label": "Use class weights in model (no data change)"},
                {"action": "keep", "label": "Keep as-is (handle in modeling)"},
            ],
            "expected_impact": "Balances class distribution for fair model training",
            "example_values": value_counts.to_dict(),
            "details": {
                "imbalance_ratio": round(imbalance_ratio, 2),
                "n_classes": n_classes,
                "class_distribution": value_counts.to_dict(),
            },
        })

    return issues


def _detect_whitespace_issues(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect leading/trailing whitespace in string columns."""
    issues = []

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
            continue

        series = df[col].dropna().astype(str)
        if len(series) == 0:
            continue

        stripped = series.str.strip()
        n_whitespace = int((series != stripped).sum())

        if n_whitespace > 0:
            pct = 100.0 * n_whitespace / len(df)
            issues.append({
                "id": f"whitespace_{col}",
                "category": "whitespace",
                "title": f"Whitespace Issues in '{col}'",
                "severity": "low",
                "columns": [col],
                "affected_count": n_whitespace,
                "affected_percentage": round(pct, 2),
                "description": f"{n_whitespace} values ({pct:.2f}%) have leading or trailing whitespace.",
                "explanation": "Whitespace can cause issues in joins, grouping, and categorical encoding.",
                "recommendation": "categorical_cleaning",
                "alternative_actions": [
                    {"action": "categorical_cleaning", "label": "Strip whitespace"},
                ],
                "expected_impact": "Cleaner categorical values",
                "example_values": series[series != stripped].head(5).tolist(),
            })

    return issues


def _detect_suspicious_values(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Detect suspicious values like negative ages, future dates, etc."""
    issues = []

    for col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue

        series = df[col].dropna()
        if len(series) == 0:
            continue

        col_lower = col.lower()

        # Negative values in columns that shouldn't be negative
        negative_keywords = ["age", "count", "quantity", "amount", "price", "cost", "revenue",
                             "salary", "income", "duration", "length", "size", "weight",
                             "height", "distance", "speed", "rate", "score", "ratio"]
        if any(kw in col_lower for kw in negative_keywords):
            n_negative = int((series < 0).sum())
            if n_negative > 0:
                pct = 100.0 * n_negative / len(series)
                issues.append({
                    "id": f"negative_values_{col}",
                    "category": "suspicious_values",
                    "title": f"Negative Values in '{col}'",
                    "severity": "high" if pct > 5 else "medium",
                    "columns": [col],
                    "affected_count": n_negative,
                    "affected_percentage": round(pct, 2),
                    "description": f"{n_negative} values ({pct:.2f}%) are negative in '{col}' "
                                   f"(expected non-negative).",
                    "explanation": f"Column '{col}' appears to represent a non-negative quantity. "
                                   f"Negative values may indicate data entry errors.",
                    "recommendation": "clip_lower_zero",
                    "alternative_actions": [
                        {"action": "clip_lower_zero", "label": "Clip negative values to 0"},
                        {"action": "remove_rows", "label": "Remove rows with negative values"},
                        {"action": "inspect", "label": "Inspect negative values"},
                    ],
                    "expected_impact": f"Fixes {n_negative} invalid negative values",
                    "example_values": series[series < 0].head(10).tolist(),
                })

    return issues


def _calculate_quality_score(df: pd.DataFrame, issues: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate an overall data quality score (0-100)."""
    n_rows, n_cols = df.shape
    total_cells = n_rows * n_cols

    # Base score starts at 100
    score = 100.0

    # Deduct for each issue based on severity and affected percentage
    severity_weights = {
        "critical": 15,
        "high": 10,
        "medium": 5,
        "low": 2,
        "info": 1,
    }

    for issue in issues:
        severity = issue.get("severity", "low")
        pct = issue.get("affected_percentage", 0)
        weight = severity_weights.get(severity, 1)
        # Scale deduction by affected percentage
        deduction = weight * (pct / 100.0) * 2
        score -= deduction

    score = max(0, min(100, score))

    # Determine grade
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    elif score >= 60:
        grade = "D"
    else:
        grade = "F"

    return {
        "score": round(score, 1),
        "grade": grade,
        "description": _score_description(score),
    }


def _score_description(score: float) -> str:
    if score >= 90:
        return "Excellent - Data is clean and ready for modeling"
    elif score >= 80:
        return "Good - Minor issues that should be addressed"
    elif score >= 70:
        return "Fair - Several issues requiring attention"
    elif score >= 60:
        return "Poor - Significant data quality problems"
    else:
        return "Critical - Major data quality issues, extensive cleaning needed"


def _group_issues_by_category(issues: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped = {}
    for issue in issues:
        cat = issue.get("category", "other")
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(issue)
    return grouped


def _group_issues_by_severity(issues: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped = {"critical": [], "high": [], "medium": [], "low": [], "info": []}
    for issue in issues:
        sev = issue.get("severity", "low")
        if sev in grouped:
            grouped[sev].append(issue)
    return grouped


def _generate_summary(df: pd.DataFrame, issues: list[dict[str, Any]]) -> dict[str, Any]:
    n_rows, n_cols = df.shape
    missing_total = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for issue in issues:
        sev = issue.get("severity", "low")
        if sev in severity_counts:
            severity_counts[sev] += 1

    return {
        "dataset_shape": {"rows": n_rows, "columns": n_cols},
        "missing_values_total": missing_total,
        "duplicate_rows_total": duplicate_rows,
        "total_issues": len(issues),
        "issues_by_severity": severity_counts,
        "numeric_columns": len([c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]),
        "categorical_columns": len([c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]),
        "datetime_columns": len([c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]),
    }


def _explain_missing_values(pct: float, is_target: bool) -> str:
    if is_target:
        return "Missing values in the target column are critical - they reduce training data and may indicate systematic issues."
    if pct > 50:
        return "More than half the values are missing. This column may not be usable without significant imputation assumptions."
    elif pct > 20:
        return "A substantial portion is missing. Consider whether the missingness is random or systematic (MNAR)."
    elif pct > 5:
        return "Moderate missingness. Standard imputation (median/mode) is usually acceptable if missing at random."
    else:
        return "Low missingness. Simple imputation will have minimal impact on analysis."


def _get_missing_alternatives(pct: float, is_numeric: bool, is_target: bool) -> list[dict[str, str]]:
    alts = []
    if is_target:
        alts.append({"action": "drop_rows_missing", "label": "Drop rows with missing target"})
        alts.append({"action": "advanced_imputation", "label": "Advanced imputation (KNN, iterative)"})
    else:
        if pct > 40:
            alts.append({"action": "drop_column", "label": "Drop column (too many missing)"})
        if is_numeric:
            alts.extend([
                {"action": "median_imputation", "label": "Median imputation (robust)"},
                {"action": "mean_imputation", "label": "Mean imputation"},
                {"action": "knn_imputation", "label": "KNN imputation"},
                {"action": "iterative_imputation", "label": "Iterative imputation (MICE)"},
            ])
        else:
            alts.extend([
                {"action": "mode_imputation", "label": "Mode imputation"},
                {"action": "constant_imputation", "label": "Constant value (e.g., 'Unknown')"},
            ])
        alts.append({"action": "drop_rows_missing", "label": "Drop rows with missing values"})
    return alts


def _get_missing_examples(df: pd.DataFrame, col: str) -> list[Any]:
    """Get example non-missing values for context."""
    non_null = df[col].dropna()
    if len(non_null) == 0:
        return ["(all values missing)"]
    return non_null.head(5).tolist()


def _get_categorical_examples(original, stripped, lower_stripped) -> list[dict[str, str]]:
    """Get examples of inconsistent categorical values."""
    examples = []
    for orig, strip, low in zip(original.head(20), stripped.head(20), lower_stripped.head(20)):
        if orig != strip or strip != low:
            examples.append({
                "original": orig,
                "cleaned": strip,
                "normalized": low,
            })
    return examples[:10]


def _serialise_value(val: Any) -> Any:
    """Serialize a value for JSON output."""
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