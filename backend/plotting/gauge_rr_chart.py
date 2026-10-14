"""gauge_rr_chart.py — Gauge R&R %Contribution-by-source bar chart."""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt

import stats

from ._style import _color, _style, _fig_to_png


def gauge_rr_contribution_chart(parts: Sequence[str], operators: Sequence[str], measurements: Sequence[float]) -> bytes:
    r = stats.gauge_rr(parts, operators, measurements)
    vc = r["variance_components"]
    labels = ["Total Gauge R&R", "Repeatability", "Reproducibility", "Part-to-Part"]
    keys = ["total_gauge_rr", "repeatability", "reproducibility", "part_to_part"]
    values = [vc[k]["pct_contribution"] for k in keys]
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.bar(labels, values, color=[_color(i) for i in range(len(labels))], width=0.6)
    ax.set_title("% Contribution by Source")
    ax.set_ylabel("% Contribution")
    ax.tick_params(axis="x", labelsize=8, rotation=10)
    _style(ax)
    return _fig_to_png(fig)
