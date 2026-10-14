"""regression_chart.py — fitted-line plot: scatter + the fitted regression line."""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt
import numpy as np

import stats

from ._style import _color, _style, _fig_to_png


def regression_chart(x: Sequence[float], y: Sequence[float], x_label: str = "X", y_label: str = "Y") -> bytes:
    r = stats.simple_linear_regression(x, y)
    xv, yv, fitted = np.array(r["x_values"]), np.array(r["y_values"]), np.array(r["fitted_values"])
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.scatter(xv, yv, color=_color(0), s=26, label="Data", zorder=3)
    order = np.argsort(xv)
    ax.plot(xv[order], fitted[order], color=_color(1), linewidth=1.6, label="Fitted line", zorder=2)
    ax.set_title("Fitted Line Plot")
    ax.set_xlabel(x_label)
    ax.set_ylabel(y_label)
    ax.legend(fontsize=8)
    _style(ax)
    return _fig_to_png(fig)
