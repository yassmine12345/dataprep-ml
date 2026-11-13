"""Production startup entrypoint.

Reads PORT/HOST from environment with safe defaults and runs uvicorn
programmatically. Using a Python script instead of shell expansion
avoids platforms that pass $PORT literally to the ASGI server.
"""
from __future__ import annotations

import os

import uvicorn

from app.main import app


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()