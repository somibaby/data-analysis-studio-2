"""histogram_chart.py — capability histogram with LSL/USL/Target shading."""
from __future__ import annotations

from typing import Optional, Sequence

import matplotlib.pyplot as plt

import stats

from ._panels import _draw_histogram_axis
from ._style import _fig_to_png


def histogram_chart(
    values: Sequence[float], bins: int = 12,
    lsl: Optional[float] = None, usl: Optional[float] = None, target: Optional[float] = None,
    title: str = "Histogram",
) -> bytes:
    h = stats.histogram(values, bins, lsl, usl, target)
    fig, ax = plt.subplots(figsize=(7, 4.2))
    _draw_histogram_axis(ax, h, title)
    return _fig_to_png(fig)
