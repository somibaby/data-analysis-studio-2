"""scatter_chart.py — general-purpose scatter plot PNG."""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt

from ._style import _color, _style, _fig_to_png


def scatter_chart(series: Sequence[dict], title: str = "", x_label: str = "", y_label: str = "") -> bytes:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    for i, s in enumerate(series):
        pts = s.get("points", [])
        xs = [p["x"] for p in pts]
        ys = [p["y"] for p in pts]
        ax.scatter(xs, ys, color=_color(i), s=28, label=str(s.get("name", f"Series {i+1}")), edgecolors="none")
    ax.set_xlabel(x_label)
    ax.set_ylabel(y_label)
    ax.set_title(title)
    if len(series) > 1:
        ax.legend(fontsize=8)
    _style(ax)
    return _fig_to_png(fig)
