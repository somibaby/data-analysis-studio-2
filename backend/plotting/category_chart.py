"""category_chart.py — bar / line / radar / pie / doughnut PNGs."""
from __future__ import annotations

from typing import Optional, Sequence

import matplotlib.pyplot as plt
import numpy as np

from ._style import _color, _style, _fig_to_png


def category_chart(
    chart_type: str,
    categories: Sequence,
    series_names: Sequence[str],
    matrix: Sequence[Sequence[Optional[float]]],
    title: str = "",
    x_label: str = "",
    y_label: str = "",
    stacked: bool = False,
) -> bytes:
    labels = [str(c) if c not in (None, "") else "(blank)" for c in categories]

    if chart_type in ("pie", "doughnut"):
        totals = [sum(v for v in row if v is not None) for row in matrix]
        colors = [_color(i) for i in range(len(series_names))]
        fig, ax = plt.subplots(figsize=(7, 4.6))
        wedgeprops = {"width": 0.45, "edgecolor": "white"} if chart_type == "doughnut" else {"edgecolor": "white"}
        nonzero = any(t > 0 for t in totals)
        ax.pie(
            totals if nonzero else [1] * len(totals),
            labels=[str(n) for n in series_names],
            colors=colors,
            autopct=(lambda p: f"{p:.1f}%" if p > 0.5 else "") if nonzero else None,
            startangle=90,
            wedgeprops=wedgeprops,
            textprops={"fontsize": 9},
        )
        ax.set_title(title)
        ax.axis("equal")
        return _fig_to_png(fig)

    if chart_type == "radar":
        n = len(labels)
        fig = plt.figure(figsize=(7, 5.2))
        ax = fig.add_subplot(111, polar=True)
        if n > 0:
            angles = np.linspace(0, 2 * np.pi, n, endpoint=False).tolist()
            angles += angles[:1]
            for i, name in enumerate(series_names):
                vals = [0.0 if v is None else float(v) for v in matrix[i]]
                vals += vals[:1]
                ax.plot(angles, vals, color=_color(i), linewidth=2, label=str(name))
                ax.fill(angles, vals, color=_color(i), alpha=0.15)
            ax.set_xticks(angles[:-1])
            ax.set_xticklabels(labels, fontsize=8)
        ax.set_title(title, pad=20)
        if len(series_names) > 1:
            ax.legend(loc="upper right", bbox_to_anchor=(1.35, 1.1), fontsize=8)
        return _fig_to_png(fig)

    # bar / line
    fig, ax = plt.subplots(figsize=(7, 4.2))
    x = np.arange(len(labels))
    n_series = max(1, len(series_names))
    rotate = len(labels) > 8

    if chart_type == "line":
        for i, name in enumerate(series_names):
            yvals = [np.nan if v is None else float(v) for v in matrix[i]]
            ax.plot(x, yvals, marker="o", markersize=4, linewidth=2,
                    color=_color(i), label=str(name))
    else:  # bar
        if stacked:
            bottom = np.zeros(len(labels))
            for i, name in enumerate(series_names):
                vals = np.array([0.0 if v is None else float(v) for v in matrix[i]], dtype=float)
                ax.bar(x, vals, bottom=bottom, color=_color(i), label=str(name), width=0.6)
                bottom += vals
        else:
            width = 0.8 / n_series
            for i, name in enumerate(series_names):
                vals = [np.nan if v is None else float(v) for v in matrix[i]]
                offset = (i - (n_series - 1) / 2) * width
                ax.bar(x + offset, vals, width=width * 0.92, color=_color(i), label=str(name))

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=30 if rotate else 0, ha="right" if rotate else "center")
    ax.set_xlabel(x_label)
    ax.set_ylabel(y_label)
    ax.set_title(title)
    if len(series_names) > 1:
        ax.legend(fontsize=8, loc="best")
    _style(ax)
    return _fig_to_png(fig)
