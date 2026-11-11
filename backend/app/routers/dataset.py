"""FastAPI routers."""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from ..services.loader import validate_upload, load_dataset
from ..services.eda import compute_eda
from ..services.anomaly import detect_anomalies
from ..store import store


router = APIRouter()


class TargetRequest(BaseModel):
    target: str | None = None


class TaskRequest(BaseModel):
    task: str  # "supervised" | "unsupervised"


class OperationsRequest(BaseModel):
    operations: list[dict[str, Any]]


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)) -> dict[str, Any]:
    """Upload a CSV/Excel/JSON dataset and return basic metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw = await file.read()
    try:
        meta = validate_upload(raw, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc

    df = load_dataset(raw, file.filename)
    dataset_id = str(uuid.uuid4())
    store.create(dataset_id, df, file.filename)
    meta["dataset_id"] = dataset_id
    return meta


@router.get("/dataset/{dataset_id}")
async def get_dataset(dataset_id: str) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = entry["original"]
    return {
        "dataset_id": dataset_id,
        "filename": entry["filename"],
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": [str(c) for c in df.columns],
        "dtypes": {str(c): str(dt) for c, dt in zip(df.columns, df.dtypes)},
        "preview": _records(df.head(10)),
        "target": entry.get("target"),
        "task": entry.get("task"),
    }


@router.post("/dataset/{dataset_id}/target")
async def set_target(dataset_id: str, body: TargetRequest) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    target = body.target
    if target is not None and target not in entry["original"].columns:
        raise HTTPException(status_code=400, detail=f"Unknown target column: {target}")
    store.set_target(dataset_id, target)
    return {"dataset_id": dataset_id, "target": target}


@router.post("/dataset/{dataset_id}/task")
async def set_task(dataset_id: str, body: TaskRequest) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if body.task not in {"supervised", "unsupervised"}:
        raise HTTPException(status_code=400, detail="Task must be supervised or unsupervised")
    store.set_task(dataset_id, body.task)
    return {"dataset_id": dataset_id, "task": body.task}


@router.get("/dataset/{dataset_id}/eda")
async def get_eda(dataset_id: str) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return compute_eda(entry["original"], entry.get("target"))


@router.get("/dataset/{dataset_id}/anomalies")
async def get_anomalies(dataset_id: str) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return detect_anomalies(entry["original"], entry.get("target"))


@router.post("/dataset/{dataset_id}/operations")
async def set_operations(dataset_id: str, body: OperationsRequest) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    store.set_operations(dataset_id, body.operations)
    return {"dataset_id": dataset_id, "operations": body.operations}


@router.post("/dataset/{dataset_id}/apply")
async def apply_operations(dataset_id: str) -> dict[str, Any]:
    entry = store.apply_operations(dataset_id, store.get(dataset_id)["operations"] if store.get(dataset_id) else [])
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = entry["transformed"]
    return {
        "dataset_id": dataset_id,
        "log": entry["applied_log"],
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "preview": _records(df.head(20)),
        "missing_total": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
    }


@router.post("/dataset/{dataset_id}/reset")
async def reset_dataset(dataset_id: str) -> dict[str, Any]:
    ok = store.reset(dataset_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"dataset_id": dataset_id, "reset": True}


@router.delete("/dataset/{dataset_id}")
async def delete_dataset(dataset_id: str) -> dict[str, Any]:
    ok = store.delete(dataset_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"dataset_id": dataset_id, "deleted": True}


@router.get("/dataset/{dataset_id}/comparison")
async def get_comparison(dataset_id: str) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    original = entry["original"]
    working = entry["working"]
    return {
        "original": {
            "rows": int(original.shape[0]),
            "columns": int(original.shape[1]),
            "missing_total": int(original.isna().sum().sum()),
            "duplicate_rows": int(original.duplicated().sum()),
            "preview": _records(original.head(20)),
        },
        "cleaned": {
            "rows": int(working.shape[0]),
            "columns": int(working.shape[1]),
            "missing_total": int(working.isna().sum().sum()),
            "duplicate_rows": int(working.duplicated().sum()),
            "preview": _records(working.head(20)),
        },
        "operations": entry["operations"],
        "log": entry["applied_log"],
    }


def _records(df) -> list[dict[str, Any]]:
    from ..services.loader import _df_to_records
    return _df_to_records(df, limit=50)