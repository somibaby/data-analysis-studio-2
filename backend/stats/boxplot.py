"""boxplot.py — Tukey quartiles/whiskers/outliers, optionally per-group."""
from __future__ import annotations
from typing import Sequence

import numpy as np
import pandas as pd


def boxplot_stats(values: Sequence[float]) -> dict:
    """Tukey/Minitab convention: whiskers extend to the most extreme point
    within 1.5*IQR of the box, not exactly to Q +/- 1.5*IQR."""
    x = np.asarray(values, dtype=float)
    x = np.sort(x[~np.isnan(x)])
    n = len(x)
    if n == 0:
        raise ValueError("No numeric data.")
    q1, median, q3 = (float(np.percentile(x, p)) for p in (25, 50, 75))
    iqr = q3 - q1
    lo_fence, hi_fence = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    inside = x[(x >= lo_fence) & (x <= hi_fence)]
    whisker_low = float(inside.min()) if len(inside) else q1
    whisker_high = float(inside.max()) if len(inside) else q3
    outliers = x[(x < lo_fence) | (x > hi_fence)].tolist()
    return {
        "n": n, "min": float(x.min()), "q1": q1, "median": median, "q3": q3, "max": float(x.max()),
        "iqr": iqr, "whisker_low": whisker_low, "whisker_high": whisker_high, "outliers": outliers,
    }


def boxplot_stats_grouped(values: Sequence[float], groups: Sequence[str] | None) -> dict:
    """Computes boxplot_stats once per group -- the same pandas-groupby-at-
    the-endpoint-layer approach pareto()/compare() already use."""
    if groups is None:
        return {"categories": ["All Data"], "stats": [{"name": "All Data", **boxplot_stats(values)}]}
    df = pd.DataFrame({"g": groups, "v": pd.to_numeric(pd.Series(values), errors="coerce")}).dropna()
    cats = list(dict.fromkeys(df["g"].tolist()))
    out = []
    for c in cats:
        vals = df.loc[df["g"] == c, "v"].tolist()
        if len(vals) == 0:
            continue
        out.append({"name": c, **boxplot_stats(vals)})
    return {"categories": [o["name"] for o in out], "stats": out}
