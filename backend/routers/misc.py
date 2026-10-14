"""
misc.py — the cross-dataset compare endpoint (self-contained pandas
aggregation, no dependency on the `stats` package) and the health check.
"""
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import pandas as pd

from db import get_db
from models import Dataset, DatasetRow

router = APIRouter()


class CompareRequest(BaseModel):
    dataset_ids: List[int]
    x_column: str
    y_column: str
    method: str = "avg"  # sum | avg | count | min | max


@router.post("/api/analysis/compare")
def analysis_compare(req: CompareRequest, db: Session = Depends(get_db)):
    """Cross-group comparison computed server-side in pandas, so comparing
    groups doesn't require shipping every row to the browser first."""
    categories_seen: list[str] = []
    seen = set()
    series = []

    for did in req.dataset_ids:
        d = db.get(Dataset, did)
        if not d:
            series.append({"name": f"(missing #{did})", "values": {}})
            continue
        try:
            x_idx = list(d.headers).index(req.x_column)
            y_idx = list(d.headers).index(req.y_column)
        except ValueError:
            series.append({"name": d.name, "values": {}})
            continue

        rows = (
            db.query(DatasetRow)
            .filter(DatasetRow.dataset_id == did)
            .order_by(DatasetRow.row_index)
            .all()
        )
        data = [
            (
                r.data[x_idx] if x_idx < len(r.data) else "",
                r.data[y_idx] if y_idx < len(r.data) else None,
            )
            for r in rows
        ]
        df = pd.DataFrame(data, columns=["x", "y"])
        df["y"] = pd.to_numeric(df["y"], errors="coerce")
        agg = {"sum": "sum", "avg": "mean", "count": "count", "min": "min", "max": "max"}.get(
            req.method, "mean"
        )
        grouped = df.groupby("x", sort=False)["y"].agg(agg)
        for cat in grouped.index:
            if cat not in seen:
                seen.add(cat)
                categories_seen.append(cat)
        series.append(
            {
                "name": d.name,
                "values": {str(k): (None if pd.isna(v) else float(v)) for k, v in grouped.items()},
            }
        )

    matrix = [[s["values"].get(str(cat)) for cat in categories_seen] for s in series]
    return {
        "categories": categories_seen,
        "series_names": [s["name"] for s in series],
        "matrix": matrix,
    }


@router.get("/api/health")
def health():
    return {"ok": True}
