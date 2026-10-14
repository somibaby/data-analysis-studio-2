"""
db.py — PostgreSQL connection setup (SQLAlchemy).

Reads DATABASE_URL from the environment (set by start.sh / a .env file).
Falls back to a sensible local default: your Mac username, no password,
localhost:5432, database "data_analysis_studio" — the common setup for
Postgres.app / Homebrew Postgres on a Mac with local trust auth.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DEFAULT_USER = os.environ.get("USER") or os.environ.get("USERNAME") or "postgres"
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"postgresql+psycopg2://{DEFAULT_USER}@localhost:5432/data_analysis_studio",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
