-- schema.sql — PostgreSQL schema for Data Analysis Studio.
-- SQLAlchemy (models.py) will also create these tables automatically on
-- first run, so running this file by hand is optional — it's here so you
-- can read the real SQL (and run it yourself with psql) rather than only
-- ever seeing it through an ORM.

CREATE TABLE IF NOT EXISTS datasets (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    headers     JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per data row, keyed by (dataset_id, row_index). Storing each
-- row as a JSONB array (aligned with datasets.headers) keeps the schema
-- generic -- you don't need to predefine columns -- while still letting
-- Postgres index and paginate efficiently at tens of thousands of rows.
CREATE TABLE IF NOT EXISTS dataset_rows (
    dataset_id  INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    row_index   INTEGER NOT NULL,
    data        JSONB NOT NULL DEFAULT '[]',
    PRIMARY KEY (dataset_id, row_index)
);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset ON dataset_rows (dataset_id);

CREATE TABLE IF NOT EXISTS charts (
    id          SERIAL PRIMARY KEY,
    title       TEXT,
    config      JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
