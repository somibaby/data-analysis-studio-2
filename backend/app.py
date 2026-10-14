"""
app.py — FastAPI backend for Data Analysis Studio.

This is the Python side of the "languages talking to each other" design:
  * The TypeScript frontend calls these endpoints over HTTP as JSON
    (fetch -> REST -> JSON response). That's the Python <-> JavaScript link.
  * Postgres is queried through SQLAlchemy, which itself sends real SQL
    under the hood -- see schema.sql for the raw statements. That's the
    Python <-> SQL link.
  * stats/ has zero web/DB code in it -- it's pure numpy/pandas -- so it
    can also be imported and used directly from a plain Python script or
    notebook, independent of the web app.

This file itself is now just the composition root: it builds the
FastAPI app, wires up the JSON inf/nan safety net, and mounts one
router per endpoint cluster from routers/ -- the actual endpoint code
lives there, grouped by topic (dataset CRUD, SPC/capability, statistical
inference, DOE, matplotlib plots, misc). See routers/__init__.py.

Run with:  uvicorn app:app --reload --port 8000
(start.sh does this for you, after checking Postgres is reachable.)
"""
from __future__ import annotations

import math
import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from db import Base, engine
from routers import datasets, spc_capability, inference, doe, plots, misc

Base.metadata.create_all(bind=engine)


def _sanitize_floats(obj):
    """Recursively replaces non-JSON-safe floats (inf/-inf/nan) with None.
    The stats package uses float("inf") as an internal sentinel for
    "statistic undefined because a denominator was exactly zero" (e.g. a
    t-value when se_mean is 0) -- perfectly fine in Python, but the JSON
    spec has no representation for Infinity/NaN, and Starlette's default
    JSONResponse renders with allow_nan=False, so any endpoint returning
    one directly would 500 on serialization. Centralizing the fix here
    (rather than hunting down every division in stats/) protects every
    endpoint, present and future."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_floats(v) for v in obj]
    return obj


class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return super().render(_sanitize_floats(content))


app = FastAPI(title="Data Analysis Studio API", default_response_class=SafeJSONResponse)

# CORS is only needed if you run the frontend on a different port during
# development (e.g. `npm run dev`). In production the FastAPI process
# serves the built frontend itself (see the StaticFiles mount at the
# bottom), so browser requests are same-origin and CORS doesn't matter.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(spc_capability.router)
app.include_router(inference.router)
app.include_router(doe.router)
app.include_router(plots.router)
app.include_router(misc.router)


# ---------------------------------------------------------------------------
# Serve the compiled TypeScript frontend (npm run build -> frontend/dist)
# ---------------------------------------------------------------------------
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
