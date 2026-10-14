"""
plotting — server-rendered matplotlib PNGs for every chart in the app.

This package is deliberately "dumb" about statistics: every chart module
here calls into the `stats` package to get the actual numbers (control
limits, histogram bins, regression fit, etc.) and only concerns itself
with drawing them. That keeps the math in exactly one place (`stats`,
still zero web/DB/plotting code) and this package purely about
matplotlib.

Headless server, no display -- the Agg backend MUST be selected here,
before anything in this package (or anything that imports this package)
ever does `import matplotlib.pyplot`. matplotlib picks a GUI backend by
default if one looks available, which then fails or hangs on a server
with no display, so this has to be the very first thing that happens --
earlier than any of this package's own submodule imports below, every
one of which imports pyplot transitively via _style.py.

This __init__.py re-exports every function app.py's routers/plots.py
calls, so `import plotting; plotting.sixpack_chart(...)` keeps working
unchanged after the split -- add new names here whenever a new chart
submodule gains a function that endpoint needs.
"""
import matplotlib
matplotlib.use("Agg")

from .category_chart import category_chart  # noqa: E402  (must follow matplotlib.use)
from .scatter_chart import scatter_chart  # noqa: E402
from .control_chart import control_chart  # noqa: E402
from .histogram_chart import histogram_chart  # noqa: E402
from .pareto_chart import pareto_chart  # noqa: E402
from .normal_probability_chart import normal_probability_plot_chart  # noqa: E402
from .sixpack_chart import sixpack_chart  # noqa: E402
from .regression_chart import regression_chart  # noqa: E402
from .boxplot_chart import boxplot_chart  # noqa: E402
from .gauge_rr_chart import gauge_rr_contribution_chart  # noqa: E402
from .doe_effects_chart import doe_effects_pareto_chart  # noqa: E402

__all__ = [
    "category_chart",
    "scatter_chart",
    "control_chart",
    "histogram_chart",
    "pareto_chart",
    "normal_probability_plot_chart",
    "sixpack_chart",
    "regression_chart",
    "boxplot_chart",
    "gauge_rr_contribution_chart",
    "doe_effects_pareto_chart",
]
