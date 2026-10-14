"""
doe_effects.py — estimates main effects and interactions from a completed
factorial experiment via the contrast-coefficient method, with a curvature
check when center points are present. Reuses _f_upper_p (significance
testing against pure error, when replicates/center points provide any)
and _norm_ppf (normal-plot of the effects) from _distributions.py.
"""
from __future__ import annotations
import itertools
from typing import Sequence

import numpy as np

from ._distributions import _f_upper_p, _norm_ppf


def factorial_effects(factor_names: Sequence[str], design: Sequence[Sequence[float]],
                       responses: Sequence[float]) -> dict:
    """Classic 2^k factorial effect estimation via the contrast-coefficient
    method. Rows with a 0 (center points) are excluded from the effect
    contrasts but used for the curvature check. Significance testing needs
    a genuine error term -- with no replicates, a full factorial has zero
    residual df (every effect + the grand mean exactly fill the design's
    df), so effects are reported without p-values unless replicated design
    points give us pure error to test against."""
    factor_names = list(factor_names)
    k = len(factor_names)
    if k < 2:
        raise ValueError("Factorial effects analysis needs at least 2 factors.")
    design = [list(row) for row in design]
    responses = list(responses)
    if len(design) != len(responses):
        raise ValueError("design and responses must have the same length.")
    if any(len(row) != k for row in design):
        raise ValueError(f"Each design row must have exactly {k} coded levels (one per factor).")

    y = np.asarray(responses, dtype=float)
    X = np.asarray(design, dtype=float)

    is_factorial_point = np.all(np.isin(X, [-1.0, 1.0]), axis=1)
    n_factorial = int(is_factorial_point.sum())
    if n_factorial < 4:
        raise ValueError("Need at least 4 two-level factorial runs to estimate effects.")

    Xf = X[is_factorial_point]
    yf = y[is_factorial_point]
    grand_mean = float(y.mean())

    # Pure error from any design points (factorial or center) that were
    # measured more than once -- the variance among those replicate
    # response values, pooled across all replicated points.
    groups: dict[tuple, list] = {}
    for row, val in zip(X, y):
        groups.setdefault(tuple(row.tolist()), []).append(val)
    ss_pure_error, df_pure_error = 0.0, 0
    for vals in groups.values():
        if len(vals) > 1:
            arr = np.array(vals, dtype=float)
            ss_pure_error += float(np.sum((arr - arr.mean()) ** 2))
            df_pure_error += len(vals) - 1
    has_error_term = df_pure_error > 0
    ms_pure_error = ss_pure_error / df_pure_error if has_error_term else None

    terms = [combo for r in range(1, k + 1) for combo in itertools.combinations(range(k), r)]

    effects = []
    coefficients = {"intercept": grand_mean}
    for combo in terms:
        contrast = np.ones(n_factorial)
        for idx in combo:
            contrast *= Xf[:, idx]
        effect = 2.0 * float(np.sum(contrast * yf)) / n_factorial
        ss = n_factorial * effect ** 2 / 4.0
        term_name = ":".join(factor_names[i] for i in combo)
        p_value = None
        if has_error_term:
            f_val = ss / ms_pure_error if ms_pure_error else float("inf")
            p_value = _f_upper_p(f_val, 1, df_pure_error)
        effects.append({"term": term_name, "effect": effect, "ss": ss, "p_value": p_value})
        coefficients[term_name] = effect / 2.0

    total_ss = sum(e["ss"] for e in effects)
    for e in effects:
        e["percent_contribution"] = (e["ss"] / total_ss * 100.0) if total_ss else 0.0
    effects.sort(key=lambda e: abs(e["effect"]), reverse=True)

    # Normal probability plot of the effects themselves (Blom's formula,
    # same as normal_probability_plot() elsewhere in this package): effects
    # that are just noise fall near a line through the origin, real effects
    # stick out.
    by_value = sorted(effects, key=lambda e: e["effect"])
    m = len(by_value)
    ranks = np.arange(1, m + 1)
    ps = (ranks - 0.375) / (m + 0.25)
    normal_effects = [
        {"term": e["term"], "effect": e["effect"], "z_score": float(_norm_ppf(float(p)))}
        for e, p in zip(by_value, ps)
    ]

    is_center_point = np.all(X == 0.0, axis=1)
    n_center = int(is_center_point.sum())
    curvature = None
    if n_center > 0 and n_factorial > 0:
        mean_factorial = float(yf.mean())
        mean_center = float(y[is_center_point].mean())
        difference = mean_factorial - mean_center
        curvature_p = None
        if has_error_term:
            ss_curv = (n_factorial * n_center * difference ** 2) / (n_factorial + n_center)
            f_curv = ss_curv / ms_pure_error if ms_pure_error else float("inf")
            curvature_p = _f_upper_p(f_curv, 1, df_pure_error)
        curvature = {
            "mean_factorial": mean_factorial, "mean_center": mean_center,
            "difference": difference, "p_value": curvature_p,
        }

    result = {
        "effects": effects,
        "normal_effects": normal_effects,
        "coefficients": coefficients,
        "curvature": curvature,
    }
    if not has_error_term:
        result["note"] = "No replicates or center-point-only error term available; effects shown without significance test."
    return result
