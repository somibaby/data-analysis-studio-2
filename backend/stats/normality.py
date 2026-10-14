"""normality.py — Anderson-Darling test for normality."""
from __future__ import annotations
import math
from typing import Sequence

import numpy as np

from ._distributions import _norm_cdf


def anderson_darling_normality(values: Sequence[float]) -> dict:
    """Anderson-Darling test against a fitted normal, with the D'Agostino &
    Stephens (1986) p-value approximation (the same formula R's
    nortest::ad.test() uses) -- attach alongside normal_probability_plot,
    don't replace it."""
    x = np.sort(np.asarray(values, dtype=float))
    x = x[~np.isnan(x)]
    n = len(x)
    if n < 8:
        raise ValueError("Anderson-Darling normality test needs at least 8 observations.")
    mean, std = float(x.mean()), float(x.std(ddof=1))
    z = (x - mean) / std
    cdf = np.clip(np.array([_norm_cdf(zi) for zi in z]), 1e-12, 1 - 1e-12)
    i = np.arange(1, n + 1)
    s = float(np.sum((2 * i - 1) * (np.log(cdf) + np.log(1 - cdf[::-1]))))
    a2 = -n - s / n
    aa = a2 * (1 + 0.75 / n + 2.25 / n ** 2)
    if aa < 0.2:
        p = 1 - math.exp(-13.436 + 101.14 * aa - 223.73 * aa ** 2)
    elif aa < 0.34:
        p = 1 - math.exp(-8.318 + 42.796 * aa - 59.938 * aa ** 2)
    elif aa < 0.6:
        p = math.exp(0.9177 - 4.279 * aa - 1.38 * aa ** 2)
    else:
        p = math.exp(1.2937 - 5.709 * aa + 0.0186 * aa ** 2)
    p = min(1.0, max(0.0, p))
    return {"n": n, "mean": mean, "stdev": std, "a_squared": a2, "a_squared_adjusted": aa, "p_value": p}
