"""
sixpack_chart.py — all 6 sixpack panels in one combined PNG (2x3 grid),
matching Minitab's actual sixpack report: 5 charts plus a
capability-numbers panel, all in the same image. Composite: reuses every
_draw_* building block in _panels.py rather than duplicating any of them.
"""
from __future__ import annotations

from typing import Optional, Sequence

import matplotlib.pyplot as plt

import stats

from ._panels import (
    _draw_control_panel, _draw_histogram_axis, _draw_normal_probability_axis,
    _draw_capability_summary, _draw_run_chart,
)
from ._style import _fig_to_png


def sixpack_chart(
    values: Sequence[float], subgroup_size: int,
    lsl: Optional[float] = None, usl: Optional[float] = None, target: Optional[float] = None,
) -> bytes:
    sp = stats.sixpack(values, subgroup_size, lsl, usl, target)
    chart = sp["chart"]

    fig = plt.figure(figsize=(13, 8))
    gs = fig.add_gridspec(2, 3, hspace=0.4, wspace=0.3)
    ax_c1 = fig.add_subplot(gs[0, 0])
    ax_c2 = fig.add_subplot(gs[0, 1])
    ax_hist = fig.add_subplot(gs[0, 2])
    ax_npp = fig.add_subplot(gs[1, 0])
    ax_cap = fig.add_subplot(gs[1, 1])
    ax_run = fig.add_subplot(gs[1, 2])

    ctype = chart["type"]
    if ctype == "xbar_r":
        _draw_control_panel(ax_c1, chart["xbar"], "Xbar Chart", "Subgroup Mean")
        _draw_control_panel(ax_c2, chart["r"], "R Chart", "Range")
    elif ctype == "xbar_s":
        _draw_control_panel(ax_c1, chart["xbar"], "Xbar Chart", "Subgroup Mean")
        _draw_control_panel(ax_c2, chart["s"], "S Chart", "Std Dev")
    else:
        _draw_control_panel(ax_c1, chart["i"], "Individuals Chart", "Value")
        _draw_control_panel(ax_c2, chart["mr"], "Moving Range Chart", "Moving Range")

    _draw_histogram_axis(ax_hist, sp["histogram"], "Histogram vs Spec")
    _draw_normal_probability_axis(ax_npp, sp["normal_probability_plot"])
    _draw_capability_summary(ax_cap, sp["capability"])
    _draw_run_chart(ax_run, sp["last_subgroups"], "Last Subgroups")

    return _fig_to_png(fig)
