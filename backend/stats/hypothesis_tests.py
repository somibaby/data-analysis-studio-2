"""
hypothesis_tests.py — 1-sample, 2-sample (Welch's), and paired t-tests,
plus one-way ANOVA. Uses the t/F distribution helpers in _distributions.py
for p-values and critical values; zero scipy.
"""
from __future__ import annotations
import math
from typing import Sequence

import numpy as np

from ._distributions import _t_two_tailed_p, _t_crit, _f_upper_p


def one_sample_ttest(values: Sequence[float], hypothesized_mean: float = 0.0) -> dict:
    x = np.asarray(values, dtype=float)
    n = len(x)
    if n < 2:
        raise ValueError("Need at least 2 observations for a 1-sample t-test.")
    mean = float(x.mean())
    stdev = float(x.std(ddof=1))
    se_mean = stdev / math.sqrt(n)
    df = n - 1
    t_value = (mean - hypothesized_mean) / se_mean if se_mean else float("inf")
    p_value = _t_two_tailed_p(t_value, df) if se_mean else (1.0 if mean == hypothesized_mean else 0.0)
    tcrit = _t_crit(0.05, df)
    return {
        "n": n, "mean": mean, "stdev": stdev, "se_mean": se_mean,
        "hypothesized_mean": hypothesized_mean,
        "t_value": t_value, "df": df, "p_value": p_value,
        "ci_lower": mean - tcrit * se_mean, "ci_upper": mean + tcrit * se_mean,
        "confidence": 0.95,
    }


def two_sample_ttest(sample1: Sequence[float], sample2: Sequence[float]) -> dict:
    """Welch's t-test (unequal variances) -- Minitab's default for 2-Sample t."""
    x1, x2 = np.asarray(sample1, dtype=float), np.asarray(sample2, dtype=float)
    n1, n2 = len(x1), len(x2)
    if n1 < 2 or n2 < 2:
        raise ValueError("Each sample needs at least 2 observations for a 2-sample t-test.")
    m1, m2 = float(x1.mean()), float(x2.mean())
    s1, s2 = float(x1.std(ddof=1)), float(x2.std(ddof=1))
    v1, v2 = (s1 ** 2) / n1, (s2 ** 2) / n2
    se_diff = math.sqrt(v1 + v2)
    diff = m1 - m2
    df = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1)) if (v1 + v2) else float(n1 + n2 - 2)
    t_value = diff / se_diff if se_diff else float("inf")
    p_value = _t_two_tailed_p(t_value, df) if se_diff else (1.0 if diff == 0 else 0.0)
    tcrit = _t_crit(0.05, df)
    return {
        "n1": n1, "mean1": m1, "stdev1": s1, "se_mean1": math.sqrt(v1),
        "n2": n2, "mean2": m2, "stdev2": s2, "se_mean2": math.sqrt(v2),
        "difference": diff, "se_difference": se_diff,
        "df": df, "t_value": t_value, "p_value": p_value,
        "ci_lower": diff - tcrit * se_diff, "ci_upper": diff + tcrit * se_diff,
        "confidence": 0.95,
    }


def paired_ttest(sample1: Sequence[float], sample2: Sequence[float]) -> dict:
    x1, x2 = np.asarray(sample1, dtype=float), np.asarray(sample2, dtype=float)
    if len(x1) != len(x2):
        raise ValueError("Paired t-test requires two samples of equal length.")
    result = one_sample_ttest((x1 - x2).tolist(), 0.0)
    result["n_pairs"] = result.pop("n")
    result["mean_difference"] = result.pop("mean")
    result["stdev_difference"] = result.pop("stdev")
    result.pop("hypothesized_mean", None)
    return result


def one_way_anova(groups: dict) -> dict:
    clean = {k: np.asarray(v, dtype=float) for k, v in groups.items() if len(v) > 0}
    clean = {k: v[~np.isnan(v)] for k, v in clean.items()}
    clean = {k: v for k, v in clean.items() if len(v) > 0}
    if len(clean) < 2:
        raise ValueError("One-Way ANOVA needs at least 2 non-empty groups.")
    all_vals = np.concatenate(list(clean.values()))
    n_total = len(all_vals)
    grand_mean = float(all_vals.mean())
    k = len(clean)

    group_stats = []
    ss_factor = 0.0
    for name, v in clean.items():
        n_i, mean_i = len(v), float(v.mean())
        stdev_i = float(v.std(ddof=1)) if n_i > 1 else 0.0
        group_stats.append({"name": name, "n": n_i, "mean": mean_i, "stdev": stdev_i})
        ss_factor += n_i * (mean_i - grand_mean) ** 2

    ss_total = float(np.sum((all_vals - grand_mean) ** 2))
    ss_error = ss_total - ss_factor
    df_factor, df_error, df_total = k - 1, n_total - k, n_total - 1
    ms_factor = ss_factor / df_factor
    ms_error = ss_error / df_error if df_error > 0 else float("nan")
    f_value = ms_factor / ms_error if ms_error else float("inf")
    p_value = _f_upper_p(f_value, df_factor, df_error) if df_error > 0 else None

    return {
        "groups": group_stats,
        "factor_df": df_factor, "factor_ss": ss_factor, "factor_ms": ms_factor,
        "error_df": df_error, "error_ss": ss_error, "error_ms": ms_error,
        "total_df": df_total, "total_ss": ss_total,
        "f_value": f_value, "p_value": p_value,
        "r_squared": ss_factor / ss_total if ss_total else None,
    }
