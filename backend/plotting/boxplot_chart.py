"""boxplot_chart.py — Tukey boxplot(s) with whiskers and outliers, grouped."""
from __future__ import annotations

from typing import Optional, Sequence

import matplotlib.pyplot as plt

import stats

from ._style import _color, _style, _fig_to_png, OOC_COLOR


def boxplot_chart(
    values: Sequence[float], groups: Optional[Sequence[str]] = None,
    title: str = "Boxplot", y_label: str = "Value",
) -> bytes:
    data = stats.boxplot_stats_grouped(values, list(groups) if groups is not None else None)
    cats, stat_list = data["categories"], data["stats"]
    fig, ax = plt.subplots(figsize=(7, 4.2))
    box_w = 0.4
    for i, s in enumerate(stat_list):
        x = i + 1
        ax.add_patch(plt.Rectangle(
            (x - box_w / 2, s["q1"]), box_w, s["q3"] - s["q1"],
            facecolor=_color(0), alpha=0.35, edgecolor=_color(0), linewidth=1.5, zorder=2,
        ))
        ax.plot([x, x], [s["whisker_low"], s["q1"]], color=_color(0), linewidth=1.3, zorder=1)
        ax.plot([x, x], [s["q3"], s["whisker_high"]], color=_color(0), linewidth=1.3, zorder=1)
        cap_w = box_w / 2
        ax.plot([x - cap_w, x + cap_w], [s["whisker_low"]] * 2, color=_color(0), linewidth=1.3, zorder=1)
        ax.plot([x - cap_w, x + cap_w], [s["whisker_high"]] * 2, color=_color(0), linewidth=1.3, zorder=1)
        ax.scatter([x], [s["median"]], color="#1f2430", marker="s", s=42, zorder=4)
        if s["outliers"]:
            ax.scatter([x] * len(s["outliers"]), s["outliers"], color=OOC_COLOR, s=26, zorder=5)
    ax.set_xticks(range(1, len(cats) + 1))
    ax.set_xticklabels([str(c) for c in cats])
    ax.set_xlim(0.4, len(cats) + 0.6)
    ax.set_title(title)
    ax.set_ylabel(y_label)
    _style(ax)
    return _fig_to_png(fig)
