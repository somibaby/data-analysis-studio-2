"""
inference.py — statistical-inference endpoints: t-tests, one-way ANOVA,
regression, correlation, normality, boxplot stats, Gauge R&R. Thin
wrappers around the `stats` package.
"""
from typing import Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import stats

from ._common_schemas import RegressionRequest, BoxplotRequest, GaugeRRRequest

router = APIRouter()


class OneSampleTTestRequest(BaseModel):
    values: List[float]
    hypothesized_mean: float = 0.0


class TwoSampleTTestRequest(BaseModel):
    sample1: List[float]
    sample2: List[float]


class PairedTTestRequest(BaseModel):
    sample1: List[float]
    sample2: List[float]


class AnovaRequest(BaseModel):
    groups: Dict[str, List[float]]


class CorrelationRequest(BaseModel):
    columns: Dict[str, List[float]]


class NormalityRequest(BaseModel):
    values: List[float]


@router.post("/api/analysis/one-sample-ttest")
def analysis_one_sample_ttest(req: OneSampleTTestRequest):
    try:
        return stats.one_sample_ttest(req.values, req.hypothesized_mean)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/two-sample-ttest")
def analysis_two_sample_ttest(req: TwoSampleTTestRequest):
    try:
        return stats.two_sample_ttest(req.sample1, req.sample2)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/paired-ttest")
def analysis_paired_ttest(req: PairedTTestRequest):
    try:
        return stats.paired_ttest(req.sample1, req.sample2)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/anova")
def analysis_anova(req: AnovaRequest):
    try:
        return stats.one_way_anova(req.groups)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/regression")
def analysis_regression(req: RegressionRequest):
    try:
        return stats.simple_linear_regression(req.x, req.y)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/correlation")
def analysis_correlation(req: CorrelationRequest):
    try:
        return stats.correlation_matrix(req.columns)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/normality")
def analysis_normality(req: NormalityRequest):
    try:
        return stats.anderson_darling_normality(req.values)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/boxplot")
def analysis_boxplot(req: BoxplotRequest):
    try:
        return stats.boxplot_stats_grouped(req.values, req.groups)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/gauge-rr")
def analysis_gauge_rr(req: GaugeRRRequest):
    try:
        return stats.gauge_rr(req.parts, req.operators, req.measurements)
    except ValueError as e:
        raise HTTPException(400, str(e))
