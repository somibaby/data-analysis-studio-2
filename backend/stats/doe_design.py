"""doe_design.py — generates a full two-level factorial design matrix."""
from __future__ import annotations
from typing import Sequence


def factorial_design(factor_names: Sequence[str], center_points: int = 0, replicates: int = 1) -> dict:
    """Full 2-level factorial design in standard (Yates) order: factor A
    alternates every row, B every 2 rows, C every 4 rows, etc. Center
    points (coded 0 for every factor) are appended after the factorial
    points; the whole block (factorial + center points) is then repeated
    `replicates` times if requested, with no randomization."""
    factor_names = list(factor_names)
    k = len(factor_names)
    if k < 2 or k > 7:
        raise ValueError("Factorial design supports between 2 and 7 factors.")
    if center_points < 0:
        raise ValueError("center_points cannot be negative.")
    if replicates < 0:
        raise ValueError("replicates cannot be negative.")

    n_factorial = 2 ** k
    block: list[dict] = []
    for i in range(n_factorial):
        row = {name: (-1 if (i // (2 ** j)) % 2 == 0 else 1) for j, name in enumerate(factor_names)}
        row["_std"] = i + 1
        block.append(row)
    for c in range(center_points):
        row = {name: 0 for name in factor_names}
        row["_std"] = n_factorial + c + 1
        block.append(row)

    runs = []
    run_order = 1
    for _ in range(replicates):
        for row in block:
            r = {"std_order": row["_std"], "run_order": run_order}
            for name in factor_names:
                r[name] = row[name]
            runs.append(r)
            run_order += 1

    return {"factor_names": factor_names, "runs": runs}
