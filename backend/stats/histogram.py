"""histogram.py — binned counts for a capability histogram, plus spec limits."""
from __future__ import annotations
from typing import Sequence

import numpy as np


def histogram(values: Sequence[float], bins: int = 12, lsl: float | None = None,
              usl: float | None = None, target: float | None = None) -> dict:
    x = np.asarray(values, dtype=float)
    counts, edges = np.histogram(x, bins=bins)
    return {
        "counts": counts.tolist(),
        "bin_edges": edges.tolist(),
        "mean": float(x.mean()),
        "std": float(x.std(ddof=1)) if len(x) > 1 else 0.0,
        "lsl": lsl, "usl": usl, "target": target,
    }
