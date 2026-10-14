"""
datasets.py — dataset/row/column CRUD, the backend for the virtualized
grid. No statistics here; this is pure SQLAlchemy/Postgres plumbing.
"""
from typing import Any, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from db import get_db
from models import Dataset, DatasetRow

router = APIRouter()


class DatasetCreate(BaseModel):
    name: str
    headers: List[str]
    rows: List[List[Any]] = []


class DatasetOut(BaseModel):
    id: int
    name: str
    headers: List[str]
    row_count: int


class RenamePayload(BaseModel):
    name: str


class CellUpdate(BaseModel):
    row_index: int
    col_index: int
    value: Any


class BulkCellUpdate(BaseModel):
    updates: List[CellUpdate]


class RowsPage(BaseModel):
    rows: List[List[Any]]
    total: int
    offset: int
    limit: int
    headers: List[str]


class AddColumnRequest(BaseModel):
    name: str = ""


def _pad(row: list, width: int) -> list:
    row = list(row)
    while len(row) < width:
        row.append("")
    return row


@router.get("/api/datasets", response_model=List[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    out = []
    for d in db.execute(select(Dataset)).scalars():
        count = db.query(DatasetRow).filter(DatasetRow.dataset_id == d.id).count()
        out.append(DatasetOut(id=d.id, name=d.name, headers=d.headers, row_count=count))
    return out


@router.post("/api/datasets", response_model=DatasetOut)
def create_dataset(payload: DatasetCreate, db: Session = Depends(get_db)):
    d = Dataset(name=payload.name, headers=payload.headers)
    db.add(d)
    db.flush()
    for i, row in enumerate(payload.rows):
        db.add(DatasetRow(dataset_id=d.id, row_index=i, data=_pad(row, len(payload.headers))))
    db.commit()
    db.refresh(d)
    return DatasetOut(id=d.id, name=d.name, headers=d.headers, row_count=len(payload.rows))


@router.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")
    db.delete(d)
    db.commit()
    return {"ok": True}


@router.put("/api/datasets/{dataset_id}/rename")
def rename_dataset(dataset_id: int, payload: RenamePayload, db: Session = Depends(get_db)):
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")
    d.name = payload.name
    db.commit()
    return {"ok": True}


@router.get("/api/datasets/{dataset_id}/page", response_model=RowsPage)
def get_rows_page(dataset_id: int, offset: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    """Windowed read for the virtualized grid -- the frontend only ever
    asks for the couple hundred rows currently scrolled into view, which
    is what lets the grid feel "unlimited" without shipping the whole
    table to the browser."""
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")
    total = db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id).count()
    q = (
        db.query(DatasetRow)
        .filter(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index)
        .offset(offset)
        .limit(limit)
    )
    rows = [_pad(r.data, len(d.headers)) for r in q]
    return RowsPage(rows=rows, total=total, offset=offset, limit=limit, headers=d.headers)


@router.get("/api/datasets/{dataset_id}/column/{col_index}")
def get_column(dataset_id: int, col_index: int, db: Session = Depends(get_db)):
    """Single-column read, used by the chart builder and the live-stats
    panel. Pulling one column this way is one request no matter the row
    count, instead of the frontend paging through the whole grid -- the
    difference between one request and dozens at tens of thousands of
    rows."""
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")
    rows = (
        db.query(DatasetRow)
        .filter(DatasetRow.dataset_id == dataset_id)
        .order_by(DatasetRow.row_index)
        .all()
    )
    values = [r.data[col_index] if col_index < len(r.data) else "" for r in rows]
    return {"values": values}


@router.patch("/api/datasets/{dataset_id}/cells")
def update_cells(dataset_id: int, payload: BulkCellUpdate, db: Session = Depends(get_db)):
    """Bulk cell writer -- one call handles an entire pasted block (paste
    from Excel splits into many {row_index, col_index, value} updates that
    all land here in a single request/transaction)."""
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")

    max_col_seen = max((u.col_index for u in payload.updates), default=-1)
    headers = list(d.headers)
    while len(headers) <= max_col_seen:
        headers.append(f"Column {len(headers) + 1}")
    if len(headers) != len(d.headers):
        d.headers = headers

    touched: dict[int, list] = {}
    for u in payload.updates:
        row = touched.get(u.row_index)
        if row is None:
            existing = db.get(DatasetRow, (dataset_id, u.row_index))
            row = _pad(existing.data, len(headers)) if existing else [""] * len(headers)
            touched[u.row_index] = row
        while len(row) <= u.col_index:
            row.append("")
        row[u.col_index] = u.value

    for row_index, row in touched.items():
        existing = db.get(DatasetRow, (dataset_id, row_index))
        if existing:
            existing.data = row
        else:
            db.add(DatasetRow(dataset_id=dataset_id, row_index=row_index, data=row))

    db.commit()
    return {"ok": True, "rows_updated": len(touched), "headers": headers}


@router.delete("/api/datasets/{dataset_id}/rows/{row_index}")
def delete_row(dataset_id: int, row_index: int, db: Session = Depends(get_db)):
    row = db.get(DatasetRow, (dataset_id, row_index))
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.post("/api/datasets/{dataset_id}/columns")
def add_column(dataset_id: int, payload: AddColumnRequest, db: Session = Depends(get_db)):
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")
    d.headers = list(d.headers) + [payload.name or f"Column {len(d.headers) + 1}"]
    db.commit()
    return {"ok": True, "headers": d.headers}


@router.delete("/api/datasets/{dataset_id}/columns/{col_index}")
def delete_column(dataset_id: int, col_index: int, db: Session = Depends(get_db)):
    d = db.get(Dataset, dataset_id)
    if not d:
        raise HTTPException(404, "dataset not found")
    headers = list(d.headers)
    if 0 <= col_index < len(headers):
        del headers[col_index]
        d.headers = headers
    for row in db.query(DatasetRow).filter(DatasetRow.dataset_id == dataset_id):
        data = list(row.data)
        if 0 <= col_index < len(data):
            del data[col_index]
            row.data = data
    db.commit()
    return {"ok": True, "headers": d.headers}
