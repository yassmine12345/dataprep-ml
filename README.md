# Generic Data Preprocessing & Cleaning Web Application for Machine Learning

Web application (React via CDN + FastAPI backend) for generic dataset preprocessing and cleaning.

## Features
- Upload CSV/TSV/TXT/XLSX/XLS/JSON datasets (max 50 MB)
- Preview data, select target column and learning task (supervised/unsupervised)
- Exploratory Data Analysis (EDA): column types, descriptive stats, missing values, outliers, numeric correlation
- Automatic issue detection with recommendations (missing values, duplicate rows/values, outliers, inconsistent categories, constant/low-cardinality, type issues)
- User-controlled operations: accept/reject/customize per issue
- Apply preprocessing (imputation, encoding, scaling/normalization, IQR outlier clipping, categorical cleaning, type correction, duplicate removal)
- Before/after comparison and export (CSV preview)
- Reset and delete dataset session

## Project Structure
- `backend/` — FastAPI app (`app/main.py`), routers, services (`loader`, `eda`, `anomaly`, `preprocessing`), in-memory `store`
- `frontend/public/` — static UI source (React CDN + Babel, Bootstrap, Chart.js)
- `frontend/dist/` — static UI served by backend when present (copy of `public/`)
- `frontend/src/` — component sources (kept for reference); runtime uses `frontend/public|dist` copies
- `datasets/` — local datasets (preserved)

## Prerequisites
- Python 3.10+ (tested with Python 3.14 in a local `.venv`)
- Backend dependencies: see `backend/requirements.txt`

## Setup (Windows PowerShell)
From the project root `Generic_Data_Preprocessing_Cleaning_ML`:

```powershell
# (Optional) create/use a virtual environment — do NOT delete any existing venv
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt

# Ensure the backend can serve the UI
New-Item -ItemType Directory -Force -Path .\frontend\dist | Out-Null
Copy-Item .\frontend\public\* .\frontend\dist\ -Recurse -Force
```

## Run
```powershell
cd .\backend
$env:PYTHONPATH = (Resolve-Path ..\backend).Path
..\ .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open: http://127.0.0.1:8000

> Note: The backend mounts `frontend/dist` at `/` if it exists (see `app/main.py`). Keep `frontend/dist` in sync with `frontend/public` after UI changes.

## API
Base: `/api/v1`
- `POST /upload` — upload dataset (multipart form field: `file`)
- `GET /dataset/{id}` — metadata/preview
- `POST /dataset/{id}/target` — set target (`{"target":"col"|null}`)
- `POST /dataset/{id}/task` — set task (`{"task":"supervised"|"unsupervised"}`)
- `GET /dataset/{id}/eda` — EDA report
- `GET /dataset/{id}/anomalies` — detected issues + recommendations
- `POST /dataset/{id}/operations` — set operations (`{"operations":[...]}`)
- `POST /dataset/{id}/apply` — apply operations
- `GET /dataset/{id}/comparison` — original vs cleaned
- `POST /dataset/{id}/reset` — reset to original
- `DELETE /dataset/{id}` — delete session

## Verified (automated API smoke test)
Executed against a running local backend with a sample CSV:
- Upload, get dataset/preview, set target/task — OK
- EDA and anomaly detection — OK (reports missing values, duplicates, outliers, inconsistent categories)
- Operations (duplicate removal, median imputation, categorical cleaning, IQR clipping) + apply — OK (rows reduced, missing/duplicates cleared in sample)
- Comparison, reset, delete — OK
- UI served from `/` with `app.js` loaded — OK

## Notes / Limitations
- Dataset state is **in-memory** (cleared on server restart).
- Transformations apply to a working copy; original preserved for reset/comparison.
- Frontend uses CDN assets (React/Babel/Chart.js/Bootstrap) — requires internet access in the browser.
- Preserve local `venv`/`.kilo` and datasets; do not commit secrets.
