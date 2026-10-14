"""
stats — Statistical Process Control (SPC) and general analysis engine.

Deliberately built on only numpy + pandas + the Python standard library
(no scipy) so it has minimal dependencies and is easy to unit test.

This package is the "Python does the number-crunching" half of the
polyglot design: it exposes plain functions that take/return simple
Python dicts and lists (JSON-serializable), which app.py (via the
routers/ package) wraps in a FastAPI REST API for the TypeScript
frontend to call, and plotting.py wraps in matplotlib charts.

One file per statistical topic (see each submodule's own docstring).
Shared distribution math (normal/t/F) lives in _distributions.py, used
internally — nothing outside this package should import it directly.

This __init__.py re-exports every function that app.py/plotting.py call,
so existing call sites like `import stats; stats.capability(...)` keep
working unchanged after the split — add new names here whenever a new
submodule gains a function those callers need.
"""
from .control_charts import xbar_r_chart, xbar_s_chart, imr_chart
from .capability import capability
from .histogram import histogram
from .pareto import pareto
from .normal_probability_plot import normal_probability_plot
from .sixpack import sixpack
from .descriptive import descriptive_stats
from .hypothesis_tests import one_sample_ttest, two_sample_ttest, paired_ttest, one_way_anova
from .regression import simple_linear_regression
from .correlation import correlation_matrix
from .normality import anderson_darling_normality
from .boxplot import boxplot_stats_grouped
from .gauge_rr import gauge_rr
from .doe_design import factorial_design
from .doe_effects import factorial_effects
from .doe_optimize import factorial_optimize

__all__ = [
    "xbar_r_chart", "xbar_s_chart", "imr_chart",
    "capability",
    "histogram",
    "pareto",
    "normal_probability_plot",
    "sixpack",
    "descriptive_stats",
    "one_sample_ttest", "two_sample_ttest", "paired_ttest", "one_way_anova",
    "simple_linear_regression",
    "correlation_matrix",
    "anderson_darling_normality",
    "boxplot_stats_grouped",
    "gauge_rr",
    "factorial_design",
    "factorial_effects",
    "factorial_optimize",
]
