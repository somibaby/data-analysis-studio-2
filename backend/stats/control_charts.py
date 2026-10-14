"""
control_charts.py — Xbar-R, Xbar-S, and I-MR Statistical Process Control
charts (Montgomery, "Introduction to Statistical Quality Control").
"""
from __future__ import annotations
from typing import Sequence

import numpy as np

# ---------------------------------------------------------------------------
# Standard SPC control-chart constants, indexed by subgroup size n (2..10).
# A2/A3: control-limit multipliers for the Xbar chart (using Rbar / Sbar).
# D3/D4: control-limit multipliers for the R chart.
# B3/B4: control-limit multipliers for the S chart.
# d2/c4: bias-correction constants used to estimate sigma from Rbar / Sbar.
# ---------------------------------------------------------------------------
SPC_CONSTANTS = {
    2:  dict(A2=1.880, D3=0.000, D4=3.267, d2=1.128, A3=2.659, B3=0.000, B4=3.267, c4=0.7979),
    3:  dict(A2=1.023, D3=0.000, D4=2.574, d2=1.693, A3=1.954, B3=0.000, B4=2.568, c4=0.8862),
    4:  dict(A2=0.729, D3=0.000, D4=2.282, d2=2.059, A3=1.628, B3=0.000, B4=2.266, c4=0.9213),
    5:  dict(A2=0.577, D3=0.000, D4=2.114, d2=2.326, A3=1.427, B3=0.000, B4=2.089, c4=0.9400),
    6:  dict(A2=0.483, D3=0.000, D4=2.004, d2=2.534, A3=1.287, B3=0.030, B4=1.970, c4=0.9515),
    7:  dict(A2=0.419, D3=0.076, D4=1.924, d2=2.704, A3=1.182, B3=0.118, B4=1.882, c4=0.9594),
    8:  dict(A2=0.373, D3=0.136, D4=1.864, d2=2.847, A3=1.099, B3=0.185, B4=1.815, c4=0.9650),
    9:  dict(A2=0.337, D3=0.184, D4=1.816, d2=2.970, A3=1.032, B3=0.239, B4=1.761, c4=0.9693),
    10: dict(A2=0.308, D3=0.223, D4=1.777, d2=3.078, A3=0.975, B3=0.284, B4=1.716, c4=0.9727),
}
# I-MR chart (subgroup size 1, uses moving range of consecutive points).
IMR_D4 = 3.267   # for n=2 moving ranges
IMR_D3 = 0.000
IMR_d2 = 1.128
IMR_E2 = 3 / IMR_d2  # 2.6596... multiplier for individuals chart limits


def _nearest_constants(n: int) -> dict:
    n = max(2, min(10, int(round(n))))
    return SPC_CONSTANTS[n]


def to_subgroups(values: Sequence[float], size: int) -> np.ndarray:
    """Chop a flat list of measurements into subgroups of `size`, dropping
    a trailing partial subgroup (matches how Minitab/JMP handle it)."""
    arr = np.asarray(values, dtype=float)
    usable = len(arr) - (len(arr) % size)
    if usable == 0:
        raise ValueError(f"Need at least {size} points for a subgroup size of {size}.")
    return arr[:usable].reshape(-1, size)


def xbar_r_chart(values: Sequence[float], subgroup_size: int) -> dict:
    """Xbar-R control chart. Returns center lines, control limits, and the
    per-subgroup means/ranges plus which subgroups are out of control."""
    sub = to_subgroups(values, subgroup_size)
    c = _nearest_constants(subgroup_size)
    means = sub.mean(axis=1)
    ranges = sub.max(axis=1) - sub.min(axis=1)
    xbar_bar = float(means.mean())
    r_bar = float(ranges.mean())

    xbar_ucl = xbar_bar + c["A2"] * r_bar
    xbar_lcl = xbar_bar - c["A2"] * r_bar
    r_ucl = c["D4"] * r_bar
    r_lcl = c["D3"] * r_bar
    sigma_within = r_bar / c["d2"] if c["d2"] else float("nan")

    return {
        "type": "xbar_r",
        "subgroup_size": subgroup_size,
        "n_subgroups": int(sub.shape[0]),
        "xbar": {
            "values": means.tolist(),
            "center": xbar_bar, "ucl": xbar_ucl, "lcl": xbar_lcl,
            "out_of_control": [i for i, v in enumerate(means) if v > xbar_ucl or v < xbar_lcl],
        },
        "r": {
            "values": ranges.tolist(),
            "center": r_bar, "ucl": r_ucl, "lcl": r_lcl,
            "out_of_control": [i for i, v in enumerate(ranges) if v > r_ucl or v < r_lcl],
        },
        "sigma_within": sigma_within,
    }


def xbar_s_chart(values: Sequence[float], subgroup_size: int) -> dict:
    """Xbar-S control chart (use over Xbar-R when subgroup size >= 8-ish)."""
    sub = to_subgroups(values, subgroup_size)
    c = _nearest_constants(subgroup_size)
    means = sub.mean(axis=1)
    stds = sub.std(axis=1, ddof=1)
    xbar_bar = float(means.mean())
    s_bar = float(stds.mean())

    xbar_ucl = xbar_bar + c["A3"] * s_bar
    xbar_lcl = xbar_bar - c["A3"] * s_bar
    s_ucl = c["B4"] * s_bar
    s_lcl = c["B3"] * s_bar
    sigma_within = s_bar / c["c4"] if c["c4"] else float("nan")

    return {
        "type": "xbar_s",
        "subgroup_size": subgroup_size,
        "n_subgroups": int(sub.shape[0]),
        "xbar": {
            "values": means.tolist(),
            "center": xbar_bar, "ucl": xbar_ucl, "lcl": xbar_lcl,
            "out_of_control": [i for i, v in enumerate(means) if v > xbar_ucl or v < xbar_lcl],
        },
        "s": {
            "values": stds.tolist(),
            "center": s_bar, "ucl": s_ucl, "lcl": s_lcl,
            "out_of_control": [i for i, v in enumerate(stds) if v > s_ucl or v < s_lcl],
        },
        "sigma_within": sigma_within,
    }


def imr_chart(values: Sequence[float]) -> dict:
    """Individuals & Moving-Range chart — for one measurement at a time
    (no natural subgroup), the most common chart on a shop floor."""
    x = np.asarray(values, dtype=float)
    if len(x) < 2:
        raise ValueError("Need at least 2 points for an I-MR chart.")
    mr = np.abs(np.diff(x))
    x_bar = float(x.mean())
    mr_bar = float(mr.mean())

    i_ucl = x_bar + IMR_E2 * mr_bar
    i_lcl = x_bar - IMR_E2 * mr_bar
    mr_ucl = IMR_D4 * mr_bar
    mr_lcl = IMR_D3 * mr_bar
    sigma_within = mr_bar / IMR_d2

    return {
        "type": "imr",
        "i": {
            "values": x.tolist(),
            "center": x_bar, "ucl": i_ucl, "lcl": i_lcl,
            "out_of_control": [i for i, v in enumerate(x) if v > i_ucl or v < i_lcl],
        },
        "mr": {
            "values": mr.tolist(),
            "center": mr_bar, "ucl": mr_ucl, "lcl": mr_lcl,
            "out_of_control": [i for i, v in enumerate(mr) if v > mr_ucl or v < mr_lcl],
        },
        "sigma_within": sigma_within,
    }


def moving_range_only(values: Sequence[float]) -> list[float]:
    # NOTE: unreferenced by app.py/plotting.py as of this restructuring's
    # audit (confirmed by grepping every caller of the stats package).
    # Kept for now since it's a legitimate, correct small utility —
    # candidate for removal in a future, separate cleanup pass.
    x = np.asarray(values, dtype=float)
    return np.abs(np.diff(x)).tolist()
