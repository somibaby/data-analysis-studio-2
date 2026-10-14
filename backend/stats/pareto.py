"""pareto.py — grouped totals sorted descending, with cumulative percent."""
from __future__ import annotations
from typing import Sequence

import pandas as pd


def pareto(categories: Sequence[str], values: Sequence[float]) -> dict:
    df = pd.DataFrame({"category": categories, "value": values})
    grouped = df.groupby("category", sort=False)["value"].sum().sort_values(ascending=False)
    total = float(grouped.sum())
    cumulative = grouped.cumsum() / total * 100 if total else grouped.cumsum()
    return {
        "categories": grouped.index.tolist(),
        "values": grouped.values.tolist(),
        "cumulative_pct": cumulative.values.tolist(),
    }
