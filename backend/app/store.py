"""Dataset session store backed by an in-memory cache with history tracking."""
from __future__ import annotations

import threading
import time
from typing import Any
from copy import deepcopy

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
                "history": [],  # Track operation history for undo
                "snapshots": [df.copy()],  # Snapshots for undo (0=original, 1=after first op, etc.)
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
            # Save snapshot before applying operations
            entry["snapshots"].append(entry["working"].copy())

            df, log = apply_operations(entry["working"], operations, target)

            # Record history entry
            history_entry = {
                "timestamp": time.time(),
                "operations": deepcopy(operations),
                "log": deepcopy(log),
                "rows_before": len(entry["working"]),
                "rows_after": len(df),
                "columns_before": len(entry["working"].columns),
                "columns_after": len(df.columns),
            }
            entry["history"].append(history_entry)

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
            entry["history"] = []
            entry["snapshots"] = [entry["original"].copy()]
            return True

    def undo(self, dataset_id: str) -> dict[str, Any] | None:
        """Undo the last applied operation."""
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is None:
                return None

            if not entry["history"]:
                return None  # Nothing to undo

            # Remove last history entry
            entry["history"].pop()

            # Restore previous snapshot
            if len(entry["snapshots"]) > 1:
                entry["snapshots"].pop()  # Remove current snapshot
                entry["working"] = entry["snapshots"][-1].copy()  # Restore previous
            else:
                entry["working"] = entry["original"].copy()

            # Recompute operations and log from history
            if entry["history"]:
                # Re-apply all remaining operations from original
                from .services.preprocessing import apply_operations
                target = entry.get("target")
                df = entry["original"].copy()
                all_ops = []
                all_logs = []
                for h in entry["history"]:
                    all_ops.extend(h["operations"])
                    all_logs.extend(h["log"])
                df, log = apply_operations(df, all_ops, target)
                entry["working"] = df
                entry["operations"] = all_ops
                entry["applied_log"] = all_logs
                entry["transformed"] = df.copy()
                # Rebuild snapshots
                entry["snapshots"] = [entry["original"].copy()]
                for h in entry["history"]:
                    entry["snapshots"].append(entry["working"].copy())  # Approximate
            else:
                entry["operations"] = []
                entry["applied_log"] = []
                entry["transformed"] = None
                entry["snapshots"] = [entry["original"].copy()]

            return entry

    def get_history(self, dataset_id: str) -> list[dict[str, Any]] | None:
        with self._lock:
            entry = self._datasets.get(dataset_id)
            if entry is None:
                return None
            return entry["history"]

    def delete(self, dataset_id: str) -> bool:
        with self._lock:
            return self._datasets.pop(dataset_id, None) is not None


store = DatasetStore()