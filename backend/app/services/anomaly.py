"""Anomaly detection and preprocessing recommendation service.

This module provides backward-compatible anomaly detection using the new
comprehensive data quality analysis.
"""
from __future__ import annotations

from typing import Any

import pandas as pd

from .data_quality import analyze_data_quality


def detect_anomalies(df: pd.DataFrame, target: str | None = None) -> dict[str, Any]:
    """Detect data-quality problems per feature and recommend preprocessing.

    This is a backward-compatible wrapper around the new analyze_data_quality function.
    """
    result = analyze_data_quality(df, target)

    # Convert to legacy format for backward compatibility
    legacy_problems = []
    feature_reports: dict[str, list[dict[str, Any]]] = {}

    for issue in result["issues"]:
        legacy_issue = _convert_to_legacy_format(issue)
        legacy_problems.append(legacy_issue)

        feature = issue["columns"][0] if issue["columns"] else "__unknown__"
        if feature not in feature_reports:
            feature_reports[feature] = []
        feature_reports[feature].append(legacy_issue)

    return {
        "total_problems": len(legacy_problems),
        "problems": legacy_problems,
        "features": feature_reports,
        # New enhanced data
        "quality_score": result["quality_score"],
        "summary": result["summary"],
        "issues_by_category": result["issues_by_category"],
        "issues_by_severity": result["issues_by_severity"],
    }


def _convert_to_legacy_format(issue: dict[str, Any]) -> dict[str, Any]:
    """Convert new issue format to legacy format."""
    feature = issue["columns"][0] if issue["columns"] else "__unknown__"

    return {
        "type": issue["category"],
        "feature": feature,
        "count": issue["affected_count"],
        "percentage": issue["affected_percentage"],
        "description": issue["description"],
        "recommendation": issue["recommendation"],
        # New fields preserved
        "severity": issue["severity"],
        "title": issue["title"],
        "explanation": issue["explanation"],
        "alternative_actions": issue["alternative_actions"],
        "expected_impact": issue["expected_impact"],
        "example_values": issue.get("example_values", []),
        "details": issue.get("details", {}),
    }