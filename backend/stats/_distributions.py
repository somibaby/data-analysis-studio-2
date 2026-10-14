"""
_distributions.py — shared probability-distribution math used across the
stats package: normal, Student's t, and F distributions, all hand-rolled
on top of a regularized incomplete beta function so the whole package
stays scipy-free (see the stats/__init__.py docstring for why).

Consumers: normality.py (_norm_cdf), normal_probability_plot.py and
doe_effects.py (_norm_ppf), hypothesis_tests.py/regression.py/
correlation.py (_t_two_tailed_p, _t_crit), hypothesis_tests.py/
regression.py/gauge_rr.py/doe_effects.py (_f_upper_p).

Do not duplicate these helpers into a consumer module — this is the one
place every statistical-inference feature imports its distribution math
from, specifically so there's exactly one implementation to get right.
"""
from __future__ import annotations
import math


def _norm_cdf(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def _norm_ppf(p: float) -> float:
    """Inverse normal CDF via Acklam's rational approximation (no scipy)."""
    if p <= 0 or p >= 1:
        raise ValueError("p must be in (0, 1)")
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    p_low, p_high = 0.02425, 1 - 0.02425
    if p < p_low:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / \
               ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p <= p_high:
        q = p - 0.5
        r = q*q
        return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / \
               (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
    q = math.sqrt(-2 * math.log(1 - p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / \
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)


def _betacf(a: float, b: float, x: float) -> float:
    """Continued-fraction evaluation for the incomplete beta function
    (Lentz's algorithm, Press et al. "Numerical Recipes")."""
    maxit, eps, fpmin = 200, 3e-14, 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < fpmin:
        d = fpmin
    d = 1.0 / d
    h = d
    for m in range(1, maxit + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = fpmin if abs(d) < fpmin else d
        c = 1.0 + aa / c
        c = fpmin if abs(c) < fpmin else c
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = fpmin if abs(d) < fpmin else d
        c = 1.0 + aa / c
        c = fpmin if abs(c) < fpmin else c
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < eps:
            break
    return h


def _betainc(a: float, b: float, x: float) -> float:
    """Regularized incomplete beta function I_x(a, b), via math.lgamma
    (standard library, not scipy) plus the continued fraction above."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    ln_beta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
    front = math.exp(ln_beta + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return front * _betacf(a, b, x) / a
    return 1.0 - front * _betacf(b, a, 1 - x) / b


def _t_two_tailed_p(t: float, df: float) -> float:
    """Two-tailed p-value for Student's t (Abramowitz & Stegun 26.7.1)."""
    t = abs(t)
    x = df / (df + t * t)
    return _betainc(df / 2.0, 0.5, x)


def _t_crit(alpha: float, df: float) -> float:
    """Two-tailed critical t via bisection on the monotone
    _t_two_tailed_p -- there's no closed-form inverse without scipy."""
    lo, hi = 0.0, 1000.0
    for _ in range(100):
        mid = (lo + hi) / 2
        if _t_two_tailed_p(mid, df) > alpha:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def _f_upper_p(f: float, df1: float, df2: float) -> float:
    """P(F > f) for the F(df1, df2) distribution (A&S 26.6.2)."""
    if f <= 0:
        return 1.0
    x = df2 / (df2 + df1 * f)
    return _betainc(df2 / 2.0, df1 / 2.0, x)
