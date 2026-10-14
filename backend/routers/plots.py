"""
plots.py — server-rendered matplotlib PNG endpoints. These replace the
old Chart.js canvas rendering; every `/api/analysis/*` JSON endpoint in
the other routers is untouched and keeps feeding the text/table/card
panels exactly as before. Pydantic request models are reused from
_common_schemas.py wherever the shape already exists (ControlChartRequest,
HistogramRequest, ParetoRequest, SixpackRequest, RegressionRequest,
BoxplotRequest, GaugeRRRequest, FactorialEffectsRequest); only the two
general-chart endpoints need their own models, mirroring what main.ts
already built client-side.
"""
from typing import Optional, List, Any
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

import plotting

from ._common_schemas import (
    ControlChartRequest, HistogramRequest, ParetoRequest, SixpackRequest,
    RegressionRequest, BoxplotRequest, GaugeRRRequest, FactorialEffectsRequest,
)

router = APIRouter()


class CategoryChartRequest(BaseModel):
    chart_type: str  # "bar" | "line" | "radar" | "pie" | "doughnut"
    categories: List[Any]
    series_names: List[str]
    matrix: List[List[Optional[float]]]
    title: str = ""
    x_label: str = ""
    y_label: str = ""
    stacked: bool = False


class ScatterPoint(BaseModel):
    x: float
    y: float


class ScatterSeries(BaseModel):
    name: str
    points: List[ScatterPoint]


class ScatterChartRequest(BaseModel):
    series: List[ScatterSeries]
    title: str = ""
    x_label: str = ""
    y_label: str = ""


def _png(png_bytes: bytes) -> Response:
    return Response(content=png_bytes, media_type="image/png")


@router.post("/api/plot/category-chart")
def plot_category_chart(req: CategoryChartRequest):
    try:
        png = plotting.category_chart(
            req.chart_type, req.categories, req.series_names, req.matrix,
            title=req.title, x_label=req.x_label, y_label=req.y_label, stacked=req.stacked,
        )
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/scatter-chart")
def plot_scatter_chart(req: ScatterChartRequest):
    series = [{"name": s.name, "points": [{"x": p.x, "y": p.y} for p in s.points]} for s in req.series]
    png = plotting.scatter_chart(series, title=req.title, x_label=req.x_label, y_label=req.y_label)
    return _png(png)


@router.post("/api/plot/control-chart")
def plot_control_chart(req: ControlChartRequest):
    try:
        png = plotting.control_chart(req.values, req.chart_type, req.subgroup_size)
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/histogram")
def plot_histogram(req: HistogramRequest):
    try:
        png = plotting.histogram_chart(req.values, req.bins, req.lsl, req.usl, req.target, title=req.title or "Histogram")
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/pareto")
def plot_pareto(req: ParetoRequest):
    try:
        png = plotting.pareto_chart(req.categories, req.values, title=req.title or "Pareto Chart")
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/normal-probability-plot")
def plot_normal_probability_plot(req: HistogramRequest):
    try:
        png = plotting.normal_probability_plot_chart(req.values)
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/sixpack")
def plot_sixpack(req: SixpackRequest):
    try:
        png = plotting.sixpack_chart(req.values, req.subgroup_size, req.lsl, req.usl, req.target)
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/regression")
def plot_regression(req: RegressionRequest):
    try:
        png = plotting.regression_chart(req.x, req.y, x_label=req.x_label or "X", y_label=req.y_label or "Y")
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/boxplot")
def plot_boxplot(req: BoxplotRequest):
    try:
        png = plotting.boxplot_chart(req.values, req.groups, title=req.title or "Boxplot", y_label=req.y_label or "Value")
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/gauge-rr")
def plot_gauge_rr(req: GaugeRRRequest):
    try:
        png = plotting.gauge_rr_contribution_chart(req.parts, req.operators, req.measurements)
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/plot/doe-effects")
def plot_doe_effects(req: FactorialEffectsRequest):
    try:
        png = plotting.doe_effects_pareto_chart(req.factor_names, req.design, req.responses)
        return _png(png)
    except ValueError as e:
        raise HTTPException(400, str(e))
