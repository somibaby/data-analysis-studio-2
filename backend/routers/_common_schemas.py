"""
_common_schemas.py — Pydantic request models used by more than one
router. Most request models in this app are scoped to a single endpoint
and live directly in that endpoint's router file; these 8 are the
exception, each shared between an `/api/analysis/*` JSON endpoint (in
spc_capability.py, inference.py, or doe.py) and its `/api/plot/*` PNG
counterpart (in plots.py) — the plot endpoints were deliberately
designed to reuse the same request shape as their JSON twin rather than
invent a parallel one, so the model has to live somewhere both routers
can import it from.
"""
from typing import Optional, List
from pydantic import BaseModel


class ControlChartRequest(BaseModel):
    values: List[float]
    chart_type: str  # "xbar_r" | "xbar_s" | "imr"
    subgroup_size: int = 1


class HistogramRequest(BaseModel):
    values: List[float]
    bins: int = 12
    lsl: Optional[float] = None
    usl: Optional[float] = None
    target: Optional[float] = None
    title: Optional[str] = None  # only used by the /api/plot/histogram PNG endpoint


class ParetoRequest(BaseModel):
    categories: List[str]
    values: List[float]
    title: Optional[str] = None  # only used by the /api/plot/pareto PNG endpoint


class SixpackRequest(BaseModel):
    values: List[float]
    subgroup_size: int = 1
    lsl: Optional[float] = None
    usl: Optional[float] = None
    target: Optional[float] = None


class RegressionRequest(BaseModel):
    x: List[float]
    y: List[float]
    x_label: Optional[str] = None  # only used by the /api/plot/regression PNG endpoint
    y_label: Optional[str] = None


class BoxplotRequest(BaseModel):
    values: List[float]
    groups: Optional[List[str]] = None
    title: Optional[str] = None  # only used by the /api/plot/boxplot PNG endpoint
    y_label: Optional[str] = None


class GaugeRRRequest(BaseModel):
    parts: List[str]
    operators: List[str]
    measurements: List[float]


class FactorialEffectsRequest(BaseModel):
    factor_names: List[str]
    design: List[List[float]]
    responses: List[float]
