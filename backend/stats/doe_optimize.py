"""doe_optimize.py — evaluates a fitted factorial model at every design corner."""
from __future__ import annotations
import itertools
from typing import Sequence


def factorial_optimize(factor_names: Sequence[str], coefficients: dict, goal: str,
                        target: float | None = None) -> dict:
    """Evaluates the fitted coded-units model (from factorial_effects'
    `coefficients`) at every corner of the 2^k design cube and picks the
    corner that best satisfies the goal -- a simple, exhaustive stand-in
    for full response-surface optimization, adequate for a two-level
    screening design where the optimum (by construction) is at a corner."""
    factor_names = list(factor_names)
    k = len(factor_names)
    if k < 1:
        raise ValueError("Need at least one factor to optimize.")
    if goal not in ("maximize", "minimize", "target"):
        raise ValueError("goal must be 'maximize', 'minimize', or 'target'.")
    if goal == "target" and target is None:
        raise ValueError("target must be provided when goal is 'target'.")

    intercept = float(coefficients.get("intercept", 0.0))

    def predict(settings: dict) -> float:
        total = intercept
        for term, coef in coefficients.items():
            if term == "intercept":
                continue
            product = 1.0
            for name in term.split(":"):
                product *= settings.get(name, 0)
            total += coef * product
        return total

    corners = []
    for bits in itertools.product([-1, 1], repeat=k):
        settings = dict(zip(factor_names, bits))
        corners.append({"settings": settings, "predicted_response": predict(settings)})

    if goal == "maximize":
        corners.sort(key=lambda c: c["predicted_response"], reverse=True)
    elif goal == "minimize":
        corners.sort(key=lambda c: c["predicted_response"])
    else:
        corners.sort(key=lambda c: abs(c["predicted_response"] - target))

    best = corners[0]
    return {
        "best_settings": best["settings"],
        "predicted_response": best["predicted_response"],
        "all_corners": corners,
    }
