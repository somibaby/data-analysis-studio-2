"""correlation.py — pairwise Pearson correlation matrix with p-values."""
from __future__ import annotations
import math

import numpy as np
import pandas as pd

from ._distributions import _t_two_tailed_p


def correlation_matrix(columns: dict) -> dict:
    names = list(columns.keys())
    if len(names) < 2:
        raise ValueError("Need at least 2 columns to correlate.")
    df = pd.DataFrame({k: pd.to_numeric(pd.Series(v), errors="coerce") for k, v in columns.items()}).dropna()
    n = len(df)
    if n < 3:
        raise ValueError("Need at least 3 complete (non-missing) rows across all selected columns.")
    r_matrix, p_matrix = [], []
    for a in names:
        r_row, p_row = [], []
        for b in names:
            if a == b:
                r_row.append(1.0)
                p_row.append(0.0)
                continue
            r = float(np.corrcoef(df[a], df[b])[0, 1])
            r = max(-1.0, min(1.0, r))
            if abs(r) >= 1.0:
                p = 0.0
            else:
                t = r * math.sqrt((n - 2) / (1 - r * r))
                p = _t_two_tailed_p(t, n - 2)
            r_row.append(r)
            p_row.append(p)
        r_matrix.append(r_row)
        p_matrix.append(p_row)
    return {"columns": names, "r": r_matrix, "p_value": p_matrix, "n": n}
