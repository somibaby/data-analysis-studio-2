"""
doe.py — Design of Experiments: generate a full factorial design,
estimate effects from completed results, and optimize a fitted model.
Thin wrappers around the `stats` package.
"""
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import stats

from ._common_schemas import FactorialEffectsRequest

router = APIRouter()


class FactorialDesignRequest(BaseModel):
    factor_names: List[str]
    center_points: int = 0
    replicates: int = 1


class FactorialOptimizeRequest(BaseModel):
    factor_names: List[str]
    coefficients: Dict[str, float]
    goal: str
    target: Optional[float] = None


@router.post("/api/analysis/doe-design")
def analysis_doe_design(req: FactorialDesignRequest):
    try:
        return stats.factorial_design(req.factor_names, req.center_points, req.replicates)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/doe-effects")
def analysis_doe_effects(req: FactorialEffectsRequest):
    try:
        return stats.factorial_effects(req.factor_names, req.design, req.responses)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/api/analysis/doe-optimize")
def analysis_doe_optimize(req: FactorialOptimizeRequest):
    try:
        return stats.factorial_optimize(req.factor_names, req.coefficients, req.goal, req.target)
    except ValueError as e:
        raise HTTPException(400, str(e))
