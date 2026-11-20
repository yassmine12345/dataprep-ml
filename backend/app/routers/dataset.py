"""FastAPI routers with comprehensive endpoints."""
from __future__ import annotations

import io
import uuid
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.loader import validate_upload, load_dataset
from ..services.eda import compute_eda
from ..services.anomaly import detect_anomalies
from ..services.data_quality import analyze_data_quality
from ..services.advanced_preprocessing import IMBALANCED_LEARN_AVAILABLE
from ..store import store


router = APIRouter()


class TargetRequest(BaseModel):
    target: str | None = None


class TaskRequest(BaseModel):
    task: str  # "supervised" | "unsupervised"


class OperationsRequest(BaseModel):
    operations: list[dict[str, Any]]


class BalancingRequest(BaseModel):
    method: str  # "smote", "random_oversample", "random_undersample", "smotenc"
    target: str
    params: dict[str, Any] | None = None


class ExportRequest(BaseModel):
    format: str = "csv"  # "csv", "excel"
    dataset: str = "cleaned"  # "original", "cleaned"


class UndoRequest(BaseModel):
    pass


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
    except Exception as exc:
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
    """Legacy endpoint - returns anomalies in old format."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return detect_anomalies(entry["original"], entry.get("target"))


@router.get("/dataset/{dataset_id}/quality")
async def get_data_quality(dataset_id: str) -> dict[str, Any]:
    """New comprehensive data quality analysis endpoint."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return analyze_data_quality(entry["original"], entry.get("target"))


@router.post("/dataset/{dataset_id}/operations")
async def set_operations(dataset_id: str, body: OperationsRequest) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    store.set_operations(dataset_id, body.operations)
    return {"dataset_id": dataset_id, "operations": body.operations}


@router.post("/dataset/{dataset_id}/apply")
async def apply_operations(dataset_id: str) -> dict[str, Any]:
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    operations = entry.get("operations", [])
    entry = store.apply_operations(dataset_id, operations)
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


@router.post("/dataset/{dataset_id}/undo")
async def undo_operation(dataset_id: str) -> dict[str, Any]:
    entry = store.undo(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found or nothing to undo")
    df = entry["working"]
    return {
        "dataset_id": dataset_id,
        "log": entry["applied_log"],
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "preview": _records(df.head(20)),
        "history": entry["history"],
    }


@router.get("/dataset/{dataset_id}/history")
async def get_history(dataset_id: str) -> dict[str, Any]:
    history = store.get_history(dataset_id)
    if history is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"dataset_id": dataset_id, "history": history}


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
        "history": entry["history"],
    }


@router.post("/dataset/{dataset_id}/balance")
async def balance_classes(dataset_id: str, body: BalancingRequest) -> dict[str, Any]:
    """Apply class balancing (SMOTE, RandomOver/Under sampling) to the dataset."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not IMBALANCED_LEARN_AVAILABLE:
        raise HTTPException(status_code=501, detail="imbalanced-learn not installed. Class balancing unavailable.")

    target = body.target
    if target not in entry["working"].columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target}' not found")

    method = body.method
    params = body.params or {}

    # Save snapshot before balancing
    entry["snapshots"].append(entry["working"].copy())

    from ..services.advanced_preprocessing import apply_advanced_operations

    operations = [{"type": method, "feature": target, "params": params}]
    df, log = apply_advanced_operations(entry["working"], operations, target)

    # Record history
    import time
    history_entry = {
        "timestamp": time.time(),
        "operations": operations,
        "log": log,
        "rows_before": len(entry["working"]),
        "rows_after": len(df),
        "columns_before": len(entry["working"].columns),
        "columns_after": len(df.columns),
    }
    entry["history"].append(history_entry)

    entry["working"] = df
    entry["transformed"] = df.copy()

    return {
        "dataset_id": dataset_id,
        "log": log,
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "preview": _records(df.head(20)),
        "class_distribution": df[target].value_counts().to_dict() if target in df.columns else {},
    }


@router.get("/dataset/{dataset_id}/explorer")
async def explore_dataset(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    columns: str | None = Query(None, description="Comma-separated column names"),
    sort_by: str | None = Query(None),
    sort_desc: bool = Query(False),
    filter_col: str | None = Query(None),
    filter_val: str | None = Query(None),
) -> dict[str, Any]:
    """Paginated dataset explorer with filtering and sorting."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = entry["working"]

    # Column selection
    if columns:
        col_list = [c.strip() for c in columns.split(",") if c.strip() in df.columns]
        if col_list:
            df = df[col_list]

    # Filtering
    if filter_col and filter_col in df.columns and filter_val is not None:
        try:
            if pd.api.types.is_numeric_dtype(df[filter_col]):
                filter_val = float(filter_val)
            df = df[df[filter_col] == filter_val]
        except Exception:
            pass  # Ignore invalid filter

    # Sorting
    if sort_by and sort_by in df.columns:
        df = df.sort_values(by=sort_by, ascending=not sort_desc)

    total_rows = len(df)
    total_pages = (total_rows + page_size - 1) // page_size

    start = (page - 1) * page_size
    end = start + page_size
    page_data = df.iloc[start:end]

    # Column profiling
    profiling = {}
    for col in df.columns:
        col_data = df[col]
        if pd.api.types.is_numeric_dtype(col_data):
            profiling[col] = {
                "type": "numeric",
                "dtype": str(col_data.dtype),
                "count": int(col_data.count()),
                "missing": int(col_data.isna().sum()),
                "mean": float(col_data.mean()) if col_data.count() > 0 else None,
                "std": float(col_data.std()) if col_data.count() > 1 else None,
                "min": float(col_data.min()) if col_data.count() > 0 else None,
                "max": float(col_data.max()) if col_data.count() > 0 else None,
                "median": float(col_data.median()) if col_data.count() > 0 else None,
            }
        else:
            value_counts = col_data.value_counts().head(20)
            profiling[col] = {
                "type": "categorical",
                "dtype": str(col_data.dtype),
                "count": int(col_data.count()),
                "missing": int(col_data.isna().sum()),
                "unique": int(col_data.nunique()),
                "top_values": value_counts.to_dict(),
            }

    return {
        "dataset_id": dataset_id,
        "page": page,
        "page_size": page_size,
        "total_rows": total_rows,
        "total_pages": total_pages,
        "columns": list(df.columns),
        "data": _records(page_data),
        "profiling": profiling,
    }


@router.get("/dataset/{dataset_id}/advisor")
async def get_data_advisor(dataset_id: str) -> dict[str, Any]:
    """Smart data advisor - analyzes dataset and suggests next steps."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = entry["working"]
    target = entry.get("target")
    task = entry.get("task")

    suggestions = []

    # 1. Check missing values
    missing_cols = df.columns[df.isna().any()].tolist()
    if missing_cols:
        for col in missing_cols[:5]:
            pct = 100.0 * df[col].isna().mean()
            suggestions.append({
                "id": f"advisor_missing_{col}",
                "category": "missing_values",
                "priority": "high" if pct > 20 else "medium" if pct > 5 else "low",
                "title": f"Handle missing values in '{col}' ({pct:.1f}%)",
                "description": f"Column '{col}' has {int(df[col].isna().sum())} missing values. "
                               f"Consider imputation or dropping rows/column.",
                "action": "impute_or_drop",
                "columns": [col],
                "details": {"missing_count": int(df[col].isna().sum()), "missing_pct": round(pct, 2)},
            })

    # 2. Check for identifier columns
    for col in df.columns:
        if col == target:
            continue
        n_unique = df[col].nunique()
        n_rows = len(df)
        if n_unique == n_rows and n_rows > 10:
            suggestions.append({
                "id": f"advisor_id_{col}",
                "category": "identifier",
                "priority": "medium",
                "title": f"Potential identifier column: '{col}'",
                "description": f"Column '{col}' has all unique values. Likely an ID column that should be excluded from modeling.",
                "action": "drop_column",
                "columns": [col],
                "details": {"unique_count": n_unique},
            })

    # 3. Check for constant columns
    constant_cols = [c for c in df.columns if df[c].nunique() == 1]
    if constant_cols:
        suggestions.append({
            "id": "advisor_constant",
            "category": "constant_columns",
            "priority": "high",
            "title": f"Drop {len(constant_cols)} constant column(s)",
            "description": f"Columns {constant_cols} have the same value for all rows and provide no information.",
            "action": "drop_columns",
            "columns": constant_cols,
            "details": {"columns": constant_cols},
        })

    # 4. Check class imbalance
    if target and target in df.columns and task == "supervised":
        vc = df[target].value_counts()
        if len(vc) >= 2:
            ratio = vc.iloc[0] / max(1, vc.iloc[-1])
            if ratio > 3:
                suggestions.append({
                    "id": f"advisor_imbalance_{target}",
                    "category": "class_imbalance",
                    "priority": "high" if ratio > 10 else "medium",
                    "title": f"Class imbalance in target '{target}' (ratio {ratio:.1f}:1)",
                    "description": f"Target has imbalanced classes. Consider SMOTE, class weights, or resampling.",
                    "action": "balance_classes",
                    "columns": [target],
                    "details": {"imbalance_ratio": round(ratio, 2), "distribution": vc.to_dict()},
                })

    # 5. Check for numeric columns that need scaling
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    if numeric_cols and len(numeric_cols) > 1:
        needs_scaling = []
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) > 1:
                std = series.std()
                mean = abs(series.mean())
                if std > 0 and (mean / std > 10 or std > 1000):
                    needs_scaling.append(col)
        if needs_scaling:
            suggestions.append({
                "id": "advisor_scaling",
                "category": "scaling",
                "priority": "medium",
                "title": f"Scale {len(needs_scaling)} numeric feature(s) with large magnitude",
                "description": "Features with very different scales can hurt model performance. Consider standardization or normalization.",
                "action": "scale_features",
                "columns": needs_scaling,
                "details": {"columns": needs_scaling},
            })

    # 6. Check for categorical columns needing encoding
    cat_cols = df.select_dtypes(exclude=["number", "datetime"]).columns.tolist()
    if cat_cols:
        high_card = [c for c in cat_cols if df[c].nunique() > 20]
        if high_card:
            suggestions.append({
                "id": "advisor_encoding",
                "category": "encoding",
                "priority": "medium",
                "title": f"Encode {len(high_card)} high-cardinality categorical column(s)",
                "description": "High cardinality categorical features need special encoding (target, frequency, or grouping).",
                "action": "encode_categorical",
                "columns": high_card,
                "details": {"columns": high_card, "cardinalities": {c: int(df[c].nunique()) for c in high_card}},
            })
        else:
            suggestions.append({
                "id": "advisor_encoding_basic",
                "category": "encoding",
                "priority": "low",
                "title": f"Encode {len(cat_cols)} categorical column(s)",
                "description": "Categorical features need encoding for most ML algorithms.",
                "action": "encode_categorical",
                "columns": cat_cols,
                "details": {"columns": cat_cols, "cardinalities": {c: int(df[c].nunique()) for c in cat_cols}},
            })

    # 7. Check for date columns
    for col in df.columns:
        if not pd.api.types.is_datetime64_any_dtype(df[col]):
            continue
        suggestions.append({
            "id": f"advisor_date_{col}",
            "category": "date_features",
            "priority": "low",
            "title": f"Extract features from date column '{col}'",
            "description": "Date columns can provide useful features like year, month, day of week, etc.",
            "action": "extract_date_features",
            "columns": [col],
            "details": {"column": col},
        })

    # 8. Check for outliers
    outlier_cols = []
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 10:
            q1, q3 = series.quantile(0.25), series.quantile(0.75)
            iqr = q3 - q1
            if iqr > 0:
                lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                n_out = int(((series < lower) | (series > upper)).sum())
                if n_out > 0 and n_out / len(series) > 0.05:
                    outlier_cols.append({"column": col, "outliers": n_out, "pct": round(100 * n_out / len(series), 2)})
    if outlier_cols:
        suggestions.append({
            "id": "advisor_outliers",
            "category": "outliers",
            "priority": "medium",
            "title": f"Handle outliers in {len(outlier_cols)} numeric column(s)",
            "description": "Outliers can skew model training. Consider clipping, transformation, or removal.",
            "action": "handle_outliers",
            "columns": [o["column"] for o in outlier_cols],
            "details": {"outlier_details": outlier_cols},
        })

    return {
        "dataset_id": dataset_id,
        "suggestions": suggestions,
        "total_suggestions": len(suggestions),
    }


@router.post("/dataset/{dataset_id}/export")
async def export_dataset(dataset_id: str, body: ExportRequest) -> StreamingResponse:
    """Export dataset as CSV or Excel."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = entry["original"] if body.dataset == "original" else entry["working"]

    if body.format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Data")
        output.seek(0)
        filename = f"{entry['filename'].rsplit('.', 1)[0]}_{body.dataset}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:  # CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        filename = f"{entry['filename'].rsplit('.', 1)[0]}_{body.dataset}.csv"
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


@router.get("/dataset/{dataset_id}/report")
async def generate_report(dataset_id: str) -> dict[str, Any]:
    """Generate a comprehensive data quality and preprocessing report."""
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    original = entry["original"]
    working = entry["working"]
    target = entry.get("target")
    task = entry.get("task")

    # Data quality analysis
    quality = analyze_data_quality(original, target)

    # Before/after comparison
    comparison = {
        "rows": {"before": int(original.shape[0]), "after": int(working.shape[0])},
        "columns": {"before": int(original.shape[1]), "after": int(working.shape[1])},
        "missing": {"before": int(original.isna().sum().sum()), "after": int(working.isna().sum().sum())},
        "duplicates": {"before": int(original.duplicated().sum()), "after": int(working.duplicated().sum())},
    }

    # Operations summary
    ops_summary = {}
    for log_entry in entry["applied_log"]:
        op_type = log_entry.get("type", "unknown")
        ops_summary[op_type] = ops_summary.get(op_type, 0) + 1

    # History summary
    history_summary = []
    for h in entry["history"]:
        history_summary.append({
            "timestamp": h["timestamp"],
            "operations_count": len(h["operations"]),
            "rows_before": h["rows_before"],
            "rows_after": h["rows_after"],
        })

    return {
        "dataset_id": dataset_id,
        "filename": entry["filename"],
        "target": target,
        "task": task,
        "quality_score": quality["quality_score"],
        "summary": quality["summary"],
        "comparison": comparison,
        "operations_applied": ops_summary,
        "history": history_summary,
        "issues_detected": quality["total_issues"],
        "issues_by_category": {k: len(v) for k, v in quality["issues_by_category"].items()},
        "issues_by_severity": {k: len(v) for k, v in quality["issues_by_severity"].items()},
    }


def _records(df) -> list[dict[str, Any]]:
    from ..services.loader import _df_to_records
    return _df_to_records(df, limit=50)