"""
_style.py — shared matplotlib visual style: the color palette (matches
the Chart.js palette this replaced, see frontend/src/charts.ts), axis
styling, capability-grade coloring, and the figure->PNG-bytes helper.

Consumers: every chart-producing submodule in this package, plus
_panels.py. Do not duplicate these helpers into a consumer — this is
the one place every chart's look-and-feel is defined.
"""
from __future__ import annotations

import io
from typing import Optional

import matplotlib.pyplot as plt

plt.rcParams["font.size"] = 10
plt.rcParams["axes.titlesize"] = 12
plt.rcParams["axes.titleweight"] = "bold"

PALETTE = [
    "#4f6df5", "#f5824f", "#2ea043", "#e0524b", "#a463f2",
    "#00b8b0", "#f2b705", "#3d84a8", "#d6488f", "#6b7280",
]
OOC_COLOR = "#e0524b"      # out-of-control / spec-limit lines
CENTER_COLOR = "#666e7d"   # control-chart center line
TARGET_COLOR = "#2ea043"   # histogram target reference line
GRID_COLOR = "#eef0f3"


def _color(i: int) -> str:
    return PALETTE[i % len(PALETTE)]


def _style(ax) -> None:
    ax.set_facecolor("white")
    ax.grid(True, color=GRID_COLOR, linewidth=0.9, zorder=0)
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#d5d9e0")
    ax.spines["bottom"].set_color("#d5d9e0")


def _fig_to_png(fig, dpi: int = 170) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def _capability_grade_color(cpk: Optional[float]) -> str:
    if cpk is None:
        return CENTER_COLOR
    if cpk >= 1.33:
        return TARGET_COLOR
    if cpk >= 1.0:
        return "#f2b705"
    return OOC_COLOR
