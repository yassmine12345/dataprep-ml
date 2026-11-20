"""Safe preprocessing service.

Applies user-approved transformations to a working copy of the dataset.
All parameters are fit on the appropriate subset to avoid data leakage.
"""
from __future__ import annotations

from typing import Any

import pandas as pd

from .advanced_preprocessing import apply_advanced_operations


def apply_operations(
    df: pd.DataFrame,
    operations: list[dict[str, Any]],
    target: str | None = None,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """Apply a list of approved operations to a copy of the dataframe.

    Returns the transformed dataframe and a log of applied operations.
    """
    return apply_advanced_operations(df, operations, target)