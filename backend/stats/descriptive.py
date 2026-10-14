"""descriptive.py — Stat > Basic Statistics > Display Descriptive Statistics."""
from __future__ import annotations
import math
from typing import Sequence

import numpy as np


def descriptive_stats(values: Sequence[float]) -> dict:
    """Stat > Basic Statistics > Display Descriptive Statistics."""
    x = np.asarray(values, dtype=float)
    x = x[~np.isnan(x)]
    n = len(x)
    if n == 0:
        raise ValueError("No numeric data.")
    mean = float(x.mean())
    stdev = float(x.std(ddof=1)) if n > 1 else 0.0
    return {
        "n": n, "mean": mean, "stdev": stdev,
        "se_mean": stdev / math.sqrt(n) if n > 0 else 0.0,
        "min": float(x.min()), "q1": float(np.percentile(x, 25)),
        "median": float(np.percentile(x, 50)), "q3": float(np.percentile(x, 75)),
        "max": float(x.max()),
    }
