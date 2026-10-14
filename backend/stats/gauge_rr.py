"""gauge_rr.py — crossed-design Gauge R&R via the ANOVA method."""
from __future__ import annotations
import math
from typing import Sequence

import pandas as pd

from ._distributions import _f_upper_p


def gauge_rr(parts: Sequence[str], operators: Sequence[str], measurements: Sequence[float]) -> dict:
    """Crossed-design Gauge R&R via the (always-unpooled) ANOVA method --
    AIAG MSA-4 / Montgomery Ch. 8. Deliberately does not replicate
    Minitab's optional pooling of a non-significant interaction term into
    error; that's a good later addition, not bundled in here."""
    if not (len(parts) == len(operators) == len(measurements)):
        raise ValueError("parts, operators, and measurements must be the same length.")
    df = pd.DataFrame({
        "part": parts, "operator": operators,
        "value": pd.to_numeric(pd.Series(measurements), errors="coerce"),
    }).dropna(subset=["value"])
    if df.empty:
        raise ValueError("No valid numeric measurements.")
    counts = df.groupby(["part", "operator"]).size()
    r = int(counts.iloc[0])
    if not (counts == r).all():
        raise ValueError(
            "Gauge R&R requires a balanced crossed design: every operator must "
            "measure every part the same number of times (at least 2 trials each)."
        )
    p_list = sorted(df["part"].unique().tolist())
    o_list = sorted(df["operator"].unique().tolist())
    p, o = len(p_list), len(o_list)
    if p < 2 or o < 2 or r < 2:
        raise ValueError("Gauge R&R needs at least 2 parts, 2 operators, and 2 trials (replicates) each.")

    grand_mean = float(df["value"].mean())
    part_means = df.groupby("part")["value"].mean()
    op_means = df.groupby("operator")["value"].mean()
    cell_means = df.groupby(["part", "operator"])["value"].mean()

    ss_total = float(((df["value"] - grand_mean) ** 2).sum())
    ss_part = o * r * float(((part_means - grand_mean) ** 2).sum())
    ss_operator = p * r * float(((op_means - grand_mean) ** 2).sum())
    ss_interaction = 0.0
    for (pp, oo), cm in cell_means.items():
        ss_interaction += r * (cm - part_means[pp] - op_means[oo] + grand_mean) ** 2
    ss_error = ss_total - ss_part - ss_operator - ss_interaction

    df_part, df_op = p - 1, o - 1
    df_int, df_err = (p - 1) * (o - 1), p * o * (r - 1)
    ms_part, ms_op = ss_part / df_part, ss_operator / df_op
    ms_int = ss_interaction / df_int if df_int else 0.0
    ms_err = ss_error / df_err

    def src(ss, dfree, ms, f=None, pval=None):
        return {"df": dfree, "ss": ss, "ms": ms, "f": f, "p": pval}

    f_part = ms_part / ms_int if ms_int else float("inf")
    f_op = ms_op / ms_int if ms_int else float("inf")
    f_int = ms_int / ms_err if ms_err else float("inf")
    anova = {
        "part": src(ss_part, df_part, ms_part, f_part, _f_upper_p(f_part, df_part, df_int) if df_int else None),
        "operator": src(ss_operator, df_op, ms_op, f_op, _f_upper_p(f_op, df_op, df_int) if df_int else None),
        "interaction": src(ss_interaction, df_int, ms_int, f_int, _f_upper_p(f_int, df_int, df_err) if df_int else None),
        "error": src(ss_error, df_err, ms_err),
        "total": {"df": p * o * r - 1, "ss": ss_total},
    }

    var_repeat = ms_err
    var_interaction = max(0.0, (ms_int - ms_err) / r)
    var_operator = max(0.0, (ms_op - ms_int) / (p * r))
    var_reproducibility = var_operator + var_interaction
    var_part = max(0.0, (ms_part - ms_int) / (o * r))
    var_gauge = var_repeat + var_reproducibility
    var_total = var_gauge + var_part

    def comp(v):
        sd = math.sqrt(v)
        sv = 5.15 * sd  # Minitab's default Study Variation multiplier
        return {
            "var": v, "stdev": sd, "study_var": sv,
            "pct_contribution": (v / var_total * 100) if var_total else 0.0,
            "pct_study_var": (sd / math.sqrt(var_total) * 100) if var_total else 0.0,
        }

    ndc = math.floor(1.41 * math.sqrt(var_part) / math.sqrt(var_gauge)) if var_gauge > 0 else 0
    return {
        "anova": anova,
        "variance_components": {
            "repeatability": comp(var_repeat), "operator": comp(var_operator),
            "operator_by_part": comp(var_interaction), "reproducibility": comp(var_reproducibility),
            "part_to_part": comp(var_part), "total_gauge_rr": comp(var_gauge),
            "total_variation": comp(var_total),
        },
        "ndc": ndc, "n_parts": p, "n_operators": o, "n_trials": r,
    }
