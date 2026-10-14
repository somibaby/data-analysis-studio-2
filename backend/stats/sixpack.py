"""
sixpack.py — the classic "process capability sixpack" report: a control
chart, histogram vs. spec, normal probability plot, capability summary,
and a run chart of the last subgroups, bundled into one call so the
frontend can render all six panels together. Composite module: imports
and calls control_charts/capability/histogram/normal_probability_plot
rather than duplicating any of their logic.
"""
from __future__ import annotations
from typing import Sequence

import numpy as np

from .control_charts import xbar_r_chart, xbar_s_chart, imr_chart
from .capability import capability
from .histogram import histogram
from .normal_probability_plot import normal_probability_plot


def sixpack(values: Sequence[float], subgroup_size: int, lsl: float | None,
            usl: float | None, target: float | None = None) -> dict:
    """The classic 'process capability sixpack' report: Xbar chart, R (or S)
    chart, histogram with spec limits, normal probability plot, capability
    summary, and a run chart of the last subgroups — six panels in one
    call so the frontend can render them together."""
    x = np.asarray(values, dtype=float)
    if subgroup_size and subgroup_size > 1:
        chart = xbar_r_chart(values, subgroup_size) if subgroup_size < 8 else xbar_s_chart(values, subgroup_size)
    else:
        chart = imr_chart(values)
    cap = capability(values, lsl, usl, sigma_within=chart.get("sigma_within"), target=target)
    hist = histogram(values, lsl=lsl, usl=usl, target=target)
    nplot = normal_probability_plot(values)
    last_n = min(len(x), max(subgroup_size or 1, 1) * 25)
    last_subgroups = x[-last_n:].tolist()

    return {
        "chart": chart,
        "capability": cap,
        "histogram": hist,
        "normal_probability_plot": nplot,
        "last_subgroups": last_subgroups,
    }
