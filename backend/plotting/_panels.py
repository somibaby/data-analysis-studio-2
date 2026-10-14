"""
_panels.py — reusable axis-drawing building blocks shared by more than
one chart. Each `_draw_*` function renders onto an existing matplotlib
Axes (doesn't create its own figure), so both a standalone chart (e.g.
histogram_chart.py) and the composite sixpack_chart.py can call the same
drawing code.

Consumers: control_chart.py and sixpack_chart.py (_draw_control_panel,
_compute_control_chart), histogram_chart.py and sixpack_chart.py
(_draw_histogram_axis), normal_probability_chart.py and sixpack_chart.py
(_draw_normal_probability_axis), sixpack_chart.py only
(_draw_capability_summary, _draw_run_chart).
"""
from __future__ import annotations

from typing import Optional, Sequence

import numpy as np

import stats

from ._style import _color, _style, OOC_COLOR, CENTER_COLOR, TARGET_COLOR, _capability_grade_color


def _draw_capability_summary(ax, cap: dict) -> None:
    """Renders the LSL/USL/Cp/Cpk/etc. numbers as text inside a subplot --
    this is what used to be a separate HTML tile grid next to the sixpack
    image; drawing it into the sixpack's own blank panel instead matches
    Minitab's actual sixpack layout (one image, six panels, no external
    side panel needed)."""
    ax.axis("off")
    ax.set_title("Capability Summary", loc="left")

    def fmt(v: Optional[float], d: int = 4) -> str:
        return "n/a" if v is None else f"{v:.{d}f}"

    rows = [
        ("LSL", fmt(cap.get("lsl")), None),
        ("Target", fmt(cap.get("target")), None),
        ("USL", fmt(cap.get("usl")), None),
        ("Mean", fmt(cap.get("mean")), None),
        ("StDev (Within)", fmt(cap.get("sigma_within")), None),
        ("StDev (Overall)", fmt(cap.get("sigma_overall")), None),
        ("Cp", fmt(cap.get("cp")), None),
        ("Cpk", fmt(cap.get("cpk")), _capability_grade_color(cap.get("cpk"))),
        ("Pp", fmt(cap.get("pp")), None),
        ("Ppk", fmt(cap.get("ppk")), _capability_grade_color(cap.get("ppk"))),
        ("PPM < LSL", fmt(cap.get("ppm_below_lsl"), 1), None),
        ("PPM > USL", fmt(cap.get("ppm_above_usl"), 1), None),
    ]
    # A single stacked column, one monospace Text object per row -- this
    # panel is narrower than it is tall, and two side-by-side columns of
    # monospace text (tried first) don't leave enough width to avoid
    # collisions between the two columns at any font size that stays
    # readable, so one column is both simpler and more reliable.
    y = 0.96
    dy = 0.08
    for label, val, color in rows:
        ax.text(0.02, y, f"{label:<16}{val:>10}", fontsize=9.5, family="monospace",
                fontweight="bold" if color else "normal",
                color=color or "#1a1a1a", transform=ax.transAxes, va="top")
        y -= dy


def _draw_control_panel(ax, series: dict, title: str, y_label: str) -> None:
    values = series["values"]
    center, ucl, lcl = series["center"], series["ucl"], series["lcl"]
    ooc = set(series["out_of_control"])
    n = len(values)
    x = np.arange(1, n + 1)
    ax.plot(x, values, color=_color(0), linewidth=1.4, zorder=3)
    pt_colors = [OOC_COLOR if i in ooc else _color(0) for i in range(n)]
    ax.scatter(x, values, color=pt_colors, s=24, zorder=4)
    ax.axhline(center, color=CENTER_COLOR, linestyle="--", linewidth=1.2, label="Center")
    ax.axhline(ucl, color=OOC_COLOR, linestyle="--", linewidth=1.2, label="UCL")
    ax.axhline(lcl, color=OOC_COLOR, linestyle="--", linewidth=1.2, label="LCL")
    ax.set_title(title)
    ax.set_xlabel("Sample")
    ax.set_ylabel(y_label)
    ax.legend(fontsize=7, loc="upper right", framealpha=0.85)
    _style(ax)


def _compute_control_chart(values: Sequence[float], chart_type: str, subgroup_size: int) -> tuple[dict, list]:
    """Returns (chart_dict, [(series, title, ylabel), (series, title, ylabel)])."""
    if chart_type == "xbar_r":
        r = stats.xbar_r_chart(values, subgroup_size)
        panels = [(r["xbar"], "Xbar Chart", "Subgroup Mean"), (r["r"], "R Chart", "Range")]
    elif chart_type == "xbar_s":
        r = stats.xbar_s_chart(values, subgroup_size)
        panels = [(r["xbar"], "Xbar Chart", "Subgroup Mean"), (r["s"], "S Chart", "Std Dev")]
    elif chart_type == "imr":
        r = stats.imr_chart(values)
        panels = [(r["i"], "Individuals Chart", "Value"), (r["mr"], "Moving Range Chart", "Moving Range")]
    else:
        raise ValueError(f"unknown chart_type {chart_type}")
    return r, panels


def _draw_histogram_axis(ax, h: dict, title: str = "Histogram") -> None:
    edges = h["bin_edges"]
    counts = h["counts"]
    lsl, usl, target = h.get("lsl"), h.get("usl"), h.get("target")
    n = len(counts)
    colors = []
    for i in range(n):
        lo, hi = edges[i], edges[i + 1]
        out = False
        if lsl is not None and (hi <= lsl or (lo < lsl < hi)):
            out = True
        if usl is not None and (lo >= usl or (lo < usl < hi)):
            out = True
        colors.append(OOC_COLOR if out else _color(0))
    centers = [(edges[i] + edges[i + 1]) / 2 for i in range(n)]
    widths = [edges[i + 1] - edges[i] for i in range(n)]
    ax.bar(centers, counts, width=widths, color=colors, edgecolor="white", linewidth=0.6, align="center")

    has_ref = False
    if lsl is not None:
        ax.axvline(lsl, color=OOC_COLOR, linestyle="--", linewidth=1.4, label="LSL")
        has_ref = True
    if usl is not None:
        ax.axvline(usl, color=OOC_COLOR, linestyle="--", linewidth=1.4, label="USL")
        has_ref = True
    if target is not None:
        ax.axvline(target, color=TARGET_COLOR, linestyle="--", linewidth=1.4, label="Target")
        has_ref = True

    ax.set_title(title)
    ax.set_xlabel("Value")
    ax.set_ylabel("Count")
    if has_ref:
        ax.legend(fontsize=8)
    _style(ax)


def _draw_normal_probability_axis(ax, npp: dict, title: str = "Normal Probability Plot") -> None:
    ax.scatter(npp["theoretical_quantiles"], npp["sorted_values"], color=_color(0), s=26, label="Data", zorder=3)
    ax.plot(npp["theoretical_quantiles"], npp["fitted_line"], color=_color(1), linewidth=1.6, label="Normal fit", zorder=2)
    ax.set_title(title)
    ax.set_xlabel("Theoretical Quantile")
    ax.set_ylabel("Value")
    ax.legend(fontsize=8)
    _style(ax)


def _draw_run_chart(ax, values: Sequence[float], title: str = "Last Subgroups") -> None:
    x = np.arange(1, len(values) + 1)
    ax.plot(x, values, color=_color(0), marker="o", markersize=3, linewidth=1.2)
    ax.set_title(title)
    ax.set_xlabel("Observation")
    ax.set_ylabel("Value")
    _style(ax)
