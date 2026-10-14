"""capability.py — process capability indices (Cp/Cpk/Pp/Ppk)."""
from __future__ import annotations
from typing import Sequence

import numpy as np


def capability(values: Sequence[float], lsl: float | None, usl: float | None,
                sigma_within: float | None = None, target: float | None = None) -> dict:
    """Process capability indices. Cp/Cpk use within-subgroup sigma (passed
    in from a control chart, i.e. short-term variation); Pp/Ppk use the
    overall sample standard deviation (long-term variation). If no
    sigma_within is supplied, Cp/Cpk fall back to the overall sigma too."""
    x = np.asarray(values, dtype=float)
    mean = float(x.mean())
    sigma_overall = float(x.std(ddof=1))
    sigma_st = sigma_within if sigma_within else sigma_overall

    def idx(sigma):
        out = {}
        if lsl is not None and usl is not None:
            out["cp_or_pp"] = (usl - lsl) / (6 * sigma) if sigma else None
        if usl is not None:
            out["upper"] = (usl - mean) / (3 * sigma) if sigma else None
        if lsl is not None:
            out["lower"] = (mean - lsl) / (3 * sigma) if sigma else None
        vals = [v for v in (out.get("upper"), out.get("lower")) if v is not None]
        out["k_or_pk"] = min(vals) if vals else None
        return out

    short = idx(sigma_st)
    long = idx(sigma_overall)

    ppm_below = float(np.mean(x < lsl) * 1e6) if lsl is not None else None
    ppm_above = float(np.mean(x > usl) * 1e6) if usl is not None else None

    return {
        "mean": mean, "sigma_overall": sigma_overall, "sigma_within": sigma_st,
        "cp": short.get("cp_or_pp"), "cpk": short.get("k_or_pk"),
        "pp": long.get("cp_or_pp"), "ppk": long.get("k_or_pk"),
        "lsl": lsl, "usl": usl, "target": target,
        "ppm_below_lsl": ppm_below, "ppm_above_usl": ppm_above,
    }
