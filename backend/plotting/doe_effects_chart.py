"""doe_effects_chart.py — DOE Pareto-of-effects bar chart."""
from __future__ import annotations

from typing import Sequence

import matplotlib.pyplot as plt

import stats

from ._style import _color, _style, _fig_to_png, OOC_COLOR


def doe_effects_pareto_chart(factor_names: Sequence[str], design: Sequence[Sequence[float]], responses: Sequence[float]) -> bytes:
    r = stats.factorial_effects(factor_names, design, responses)
    effects = r["effects"]  # already sorted descending by |effect|
    labels = [e["term"] for e in effects]
    values = [abs(e["effect"]) for e in effects]
    colors = [OOC_COLOR if (e["p_value"] is not None and e["p_value"] < 0.05) else _color(0) for e in effects]
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.bar(labels, values, color=colors, width=0.6)
    ax.set_title("Pareto of Effects")
    ax.set_xlabel("Term")
    ax.set_ylabel("|Effect|")
    ax.tick_params(axis="x", labelsize=8, rotation=30)
    _style(ax)
    return _fig_to_png(fig)
