"""
spc_capability.py — SPC control charts, process capability, histogram,
Pareto, the sixpack composite, the normal probability plot (+ its
Anderson-Darling test), and descriptive statistics. All thin wrappers
around the `stats` package.
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import stats

from ._common_schemas import ControlChartRequest, HistogramRequest, ParetoRequest, SixpackRequest

router = APIRouter()


class CapabilityRequest(BaseModel):
    values: List[float]
    lsl: Optional[float] = None
    usl: Optional[float] = None
    sigma_within: Optional[float] = None
    target: Optional[float] = None


class DescriptiveStatsRequest(BaseModel):
    values: List[float]


@router.post("/api/analysis/control-chart")
def control_chart(req: ControlChartRequest):
    try:
        if req.chart_type == "xbar_r":
            return stats.xbar_r_chart(req.values, req.subgroup_size)
        if req.chart_type == "xbar_s":
            return stats.xbar_s_chart(req.values, req.subgroup_size)
        if req.chart_type == "imr":
            return stats.imr_chart(req.values)
        raise HTTPException(400, f"unknown chart_type {req.chart_type}")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/capability")
def analysis_capability(req: CapabilityRequest):
    return stats.capability(req.values, req.lsl, req.usl, req.sigma_within, req.target)


@router.post("/api/analysis/histogram")
def analysis_histogram(req: HistogramRequest):
    return stats.histogram(req.values, req.bins, req.lsl, req.usl, req.target)


@router.post("/api/analysis/pareto")
def analysis_pareto(req: ParetoRequest):
    return stats.pareto(req.categories, req.values)


@router.post("/api/analysis/sixpack")
def analysis_sixpack(req: SixpackRequest):
    try:
        return stats.sixpack(req.values, req.subgroup_size, req.lsl, req.usl, req.target)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/normal-probability-plot")
def analysis_normal_probability_plot(req: HistogramRequest):
    try:
        npp = stats.normal_probability_plot(req.values)
        npp["ad_test"] = stats.anderson_darling_normality(req.values)
        return npp
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/descriptive-stats")
def analysis_descriptive_stats(req: DescriptiveStatsRequest):
    try:
        return stats.descriptive_stats(req.values)
    except ValueError as e:
        raise HTTPException(400, str(e))
