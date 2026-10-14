"""regression.py — ordinary least-squares simple linear regression."""
from __future__ import annotations
import math
from typing import Sequence

import numpy as np

from ._distributions import _t_two_tailed_p, _f_upper_p


def simple_linear_regression(x: Sequence[float], y: Sequence[float]) -> dict:
    xa, ya = np.asarray(x, dtype=float), np.asarray(y, dtype=float)
    n = len(xa)
    if n < 3 or len(ya) != n:
        raise ValueError("Regression needs at least 3 paired (x, y) points.")
    xbar, ybar = float(xa.mean()), float(ya.mean())
    sxx = float(np.sum((xa - xbar) ** 2))
    if sxx == 0:
        raise ValueError("X values have no variation; cannot fit a line.")
    sxy = float(np.sum((xa - xbar) * (ya - ybar)))
    slope = sxy / sxx
    intercept = ybar - slope * xbar
    fitted = intercept + slope * xa
    residuals = ya - fitted
    sse = float(np.sum(residuals ** 2))
    ssr = float(np.sum((fitted - ybar) ** 2))
    sst = sse + ssr
    df_resid = n - 2
    mse = sse / df_resid if df_resid > 0 else 0.0
    se_regression = math.sqrt(mse)
    se_slope = math.sqrt(mse / sxx) if mse else 0.0
    se_intercept = math.sqrt(mse * (1.0 / n + xbar ** 2 / sxx)) if mse else 0.0
    t_slope = slope / se_slope if se_slope else float("inf")
    t_intercept = intercept / se_intercept if se_intercept else float("inf")
    f_value = (ssr / 1) / mse if mse else float("inf")
    return {
        "n": n, "slope": slope, "intercept": intercept,
        "se_slope": se_slope, "se_intercept": se_intercept,
        "t_slope": t_slope, "p_slope": _t_two_tailed_p(t_slope, df_resid) if df_resid > 0 else None,
        "t_intercept": t_intercept, "p_intercept": _t_two_tailed_p(t_intercept, df_resid) if df_resid > 0 else None,
        "r_squared": ssr / sst if sst else None,
        "adj_r_squared": 1 - (1 - ssr / sst) * (n - 1) / df_resid if sst and df_resid > 0 else None,
        "f_value": f_value, "p_value_f": _f_upper_p(f_value, 1, df_resid) if df_resid > 0 else None,
        "df_resid": df_resid, "se_regression": se_regression,
        "x_values": xa.tolist(), "y_values": ya.tolist(),
        "fitted_values": fitted.tolist(), "residuals": residuals.tolist(),
    }
