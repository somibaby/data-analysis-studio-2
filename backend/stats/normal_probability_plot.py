"""normal_probability_plot.py — sorted data vs. theoretical normal quantiles."""
from __future__ import annotations
from typing import Sequence

import numpy as np

from ._distributions import _norm_ppf


def normal_probability_plot(values: Sequence[float]) -> dict:
    """Points for a normal probability plot: sorted data vs. theoretical
    normal quantiles (using median ranks / Blom's formula)."""
    x = np.sort(np.asarray(values, dtype=float))
    n = len(x)
    ranks = np.arange(1, n + 1)
    p = (ranks - 0.375) / (n + 0.25)  # Blom's approximation
    theoretical = [_norm_ppf(pi) for pi in p]
    mean, std = float(x.mean()), float(x.std(ddof=1)) if n > 1 else 0.0
    fitted_line = [mean + std * t for t in theoretical]
    return {
        "sorted_values": x.tolist(),
        "theoretical_quantiles": theoretical,
        "fitted_line": fitted_line,
        "mean": mean, "std": std,
    }
