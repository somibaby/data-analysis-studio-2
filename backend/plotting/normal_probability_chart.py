"""
normal_probability_chart.py — normal probability plot PNG. Also reused
for the DOE normal-effects plot by main.ts, which just passes effect
estimates in place of raw data (same math, same drawing).
"""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt

import stats

from ._panels import _draw_normal_probability_axis
from ._style import _fig_to_png


def normal_probability_plot_chart(values: Sequence[float]) -> bytes:
    npp = stats.normal_probability_plot(values)
    fig, ax = plt.subplots(figsize=(7, 4.2))
    _draw_normal_probability_axis(ax, npp)
    return _fig_to_png(fig)
