"""Dataset session store backed by an in-memory cache."""
from __future__ import annotations

import threading
from typing import Any

import pandas as pd


class DatasetStore:
    """Thread-safe in-memory store for uploaded datasets and their state."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._datasets: dict[str, dict[str, Any]] = {}

    def create(self, dataset_id: str, df: pd.DataFrame, filename: str) -> dict[str, Any]:
        with self._lock:
            entry: dict[str, Any] = {
                "id": dataset_id,
                "filename": filename,
                "original": df,
                "working": df.copy(),
                "target": None,
                "task": None,
                "operations": [],
                "applied_log": [],
                "transformed": None,
            }
            self._datasets[dataset_id] = entry
            return entry

    def get(self, dataset_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._datasets.get(dataset_id)

    def set_target(self, dataset_id: str, target: str | None) -> None:
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is not None:
                entry["target"] = target

    def set_task(self, dataset_id: str, task: str | None) -> None:
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is not None:
                entry["task"] = task

    def set_operations(self, dataset_id: str, operations: list[dict[str, Any]]) -> None:
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is not None:
                entry["operations"] = list(operations)

    def apply_operations(
        self, dataset_id: str, operations: list[dict[str, Any]]
    ) -> dict[str, Any] | None:
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is None:
                return None
            from .services.preprocessing import apply_operations

            target = entry.get("target")
            df, log = apply_operations(entry["original"], operations, target)
            entry["working"] = df
            entry["operations"] = list(operations)
            entry["applied_log"] = log
            entry["transformed"] = df.copy()
            return entry

    def reset(self, dataset_id: str) -> bool:
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is None:
                return False
            entry["working"] = entry["original"].copy()
            entry["operations"] = []
            entry["applied_log"] = []
            entry["transformed"] = None
            return True

    def delete(self, dataset_id: str) -> bool:
        with self._lock:
            return self._datasets.pop(dataset_id, None) is not None


store = DatasetStore()