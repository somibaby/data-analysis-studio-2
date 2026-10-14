"""pareto_chart.py — bars + cumulative-% line, dual axis."""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt
import numpy as np

import stats

from ._style import _color, _style, _fig_to_png


def pareto_chart(categories: Sequence[str], values: Sequence[float], title: str = "Pareto Chart") -> bytes:
    p = stats.pareto(categories, values)
    cats, vals, cum = p["categories"], p["values"], p["cumulative_pct"]
    fig, ax1 = plt.subplots(figsize=(7, 4.2))
    x = np.arange(len(cats))
    ax1.bar(x, vals, color=_color(0), width=0.6, zorder=3)
    rotate = len(cats) > 6
    ax1.set_xticks(x)
    ax1.set_xticklabels([str(c) for c in cats], rotation=30 if rotate else 0, ha="right" if rotate else "center")
    ax1.set_ylabel("Count")
    ax1.set_title(title)
    _style(ax1)

    ax2 = ax1.twinx()
    ax2.plot(x, cum, color=_color(1), marker="o", markersize=4, linewidth=1.6, zorder=4)
    ax2.set_ylim(0, 105)
    ax2.set_ylabel("Cumulative %")
    ax2.spines["top"].set_visible(False)
    ax2.grid(False)
    return _fig_to_png(fig)
