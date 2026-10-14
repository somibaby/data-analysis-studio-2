"""models.py — SQLAlchemy ORM models mapping to schema.sql."""
from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from db import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    headers = Column(JSONB, nullable=False, default=list)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    rows = relationship("DatasetRow", cascade="all, delete-orphan", back_populates="dataset")


class DatasetRow(Base):
    __tablename__ = "dataset_rows"

    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)
    row_index = Column(Integer, primary_key=True)
    data = Column(JSONB, nullable=False, default=list)

    dataset = relationship("Dataset", back_populates="rows")


class ChartConfig(Base):
    # NOTE: unreferenced by any router as of the Oct 2026 restructuring's
    # audit (every router file was checked against this model name) --
    # the frontend's "Graphs" sidebar list is client-side only (windows.ts)
    # and never persists a saved chart config here. Kept as-is since
    # dropping a table is a real schema change, out of scope for a
    # zero-behavior-change pass; candidate for a future, separate cleanup.
    __tablename__ = "charts"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    config = Column(JSONB, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
