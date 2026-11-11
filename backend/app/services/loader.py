"""Data loading and validation services."""
from __future__ import annotations

import io
import os
from typing import Any

import numpy as np
import pandas as pd


ALLOWED_EXTENSIONS = {".csv", ".tsv", ".txt", ".xlsx", ".xls", ".json"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def detect_separator(raw: bytes) -> str:
    """Detect CSV separator from the first chunk of raw bytes."""
    try:
        sample = raw[:4096].decode("utf-8", errors="replace")
    except Exception:
        return ","
    candidates = [",", ";", "\t", "|"]
    counts = {sep: sample.count(sep) for sep in candidates}
    return max(counts, key=counts.get) or ","


def load_dataset(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Load a dataset from raw bytes, supporting CSV, Excel and JSON."""
    name = (filename or "").lower()
    buffer = io.BytesIO(file_bytes)

    if name.endswith((".xlsx", ".xls")):
        try:
            return pd.read_excel(buffer, engine="openpyxl" if name.endswith(".xlsx") else "xlrd")
        except Exception as exc:  # pragma: no cover - defensive
            raise ValueError(f"Unable to read Excel file: {exc}") from exc

    if name.endswith(".json"):
        try:
            return pd.read_json(buffer)
        except Exception as exc:
            raise ValueError(f"Unable to read JSON file: {exc}") from exc

    # Default: CSV-like
    sep = detect_separator(file_bytes)
    try:
        df = pd.read_csv(buffer, sep=sep, engine="python", on_bad_lines="skip")
    except Exception as exc:
        raise ValueError(f"Unable to parse CSV file: {exc}") from exc

    if df.empty:
        raise ValueError("The uploaded dataset is empty.")
    return df


def validate_upload(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Validate an uploaded file and return basic metadata."""
    if not filename:
        raise ValueError("No file name provided.")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. Allowed types: "
            + ", ".join(sorted(ALLOWED_EXTENSIONS))
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large: {len(file_bytes) / 1e6:.1f} MB. Maximum allowed: "
            f"{MAX_FILE_SIZE / 1e6:.0f} MB."
        )

    if len(file_bytes) == 0:
        raise ValueError("The uploaded file is empty.")

    try:
        df = load_dataset(file_bytes, filename)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Corrupted or unreadable dataset: {exc}") from exc

    if df.shape[0] == 0 or df.shape[1] == 0:
        raise ValueError("The dataset has no rows or no columns.")

    return {
        "filename": filename,
        "size_bytes": len(file_bytes),
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": [str(c) for c in df.columns],
        "dtypes": {str(c): str(dt) for c, dt in zip(df.columns, df.dtypes)},
        "preview": _df_to_records(df.head(10)),
    }


def _df_to_records(df: pd.DataFrame, limit: int = 50) -> list[dict[str, Any]]:
    """Convert a DataFrame slice to JSON-serialisable records."""
    head = df.head(limit)
    records: list[dict[str, Any]] = []
    for _, row in head.iterrows():
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
    if isinstance(val, (np.ndarray,)):
        return [_serialise_value(v) for v in val.tolist()]
    if isinstance(val, (bytes, bytearray)):
        try:
            return val.decode("utf-8", errors="replace")
        except Exception:
            return str(val)
    return val