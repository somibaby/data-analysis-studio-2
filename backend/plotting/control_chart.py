"""control_chart.py — Xbar-R / Xbar-S / I-MR, two panels in one PNG."""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt

from ._panels import _draw_control_panel, _compute_control_chart
from ._style import _fig_to_png


def control_chart(values: Sequence[float], chart_type: str, subgroup_size: int = 1) -> bytes:
    _, panels = _compute_control_chart(values, chart_type, subgroup_size)
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))
    for ax, (series, title, y_label) in zip(axes, panels):
        _draw_control_panel(ax, series, title, y_label)
    fig.tight_layout()
    return _fig_to_png(fig)
