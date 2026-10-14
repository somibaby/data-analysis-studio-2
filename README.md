# Data Analysis Studio

A local, offline-after-setup data analysis app: an Excel-like grid that scales
to tens of thousands of rows, general-purpose comparison charts, a full
manufacturing SPC (Statistical Process Control) suite, a statistical-inference
suite (t-tests, ANOVA, regression, correlation, normality, Gauge R&R), and a
Design of Experiments module — control charts, process capability, Pareto,
the classic "sixpack" report, and 2-level factorial design/analysis.

It's deliberately built as a small polyglot stack rather than one language
doing everything, because each piece is genuinely better suited to its job:

| Layer | Language | Job |
|---|---|---|
| Statistics engine | **Python** (numpy/pandas, no scipy) | Control limits, Cp/Cpk/Pp/Ppk, hypothesis tests, regression, DOE — the math |
| Chart rendering | **Python** (matplotlib) | Every chart image, rendered server-side and served as a PNG |
| Backend API | **Python** (FastAPI) | REST endpoints, talks to Postgres, serves the built frontend |
| Database | **SQL** (PostgreSQL) | Stores your datasets so they survive a restart |
| Interactive UI | **TypeScript** | The grid, the chart builder, the floating graph windows, talks to the API |
| Live in-browser stats | **Rust → WebAssembly** | Instant Cpk/control-limit feedback as you type, no network round trip |
| Setup & orchestration | **Bash** | `start.sh` — one command wires everything above together |

## How the languages actually talk to each other

This is the part worth reading if you're using this project to learn how
different languages link up — there are two genuinely different mechanisms
here, both extremely common in real software:

**Python ↔ TypeScript, over HTTP as JSON.** `frontend/src/api/` calls
`fetch()` against endpoints defined in `backend/routers/`. Neither side needs
to know what language the other is written in — they only need to agree on
a URL and a JSON shape. This is by far the most common way two languages
talk to each other in the real world (it's how virtually every web app
talks to virtually every backend).

Every chart is a special case of this: the frontend never draws a pixel
itself. It POSTs the raw values to a `/api/plot/*` endpoint, the backend
renders the chart with matplotlib (`matplotlib.use("Agg")` — no display,
just a PNG encoder) and sends back image bytes, and the frontend drops
those bytes into an `<img>`. The numeric/text result panels (capability
card, t-test tables, correlation matrix, etc.) are the one exception —
those are still built as plain HTML on the frontend from a JSON
`/api/analysis/*` response, since a table of numbers doesn't need a
rendered image.

**Python ↔ SQL.** `backend/db.py` and `backend/models.py` use SQLAlchemy to
send real SQL statements to PostgreSQL — see `backend/schema.sql` for the
raw table definitions if you want to see it without the ORM in the way.

**Rust ↔ TypeScript, via WebAssembly, in the same process.** This is a
different kind of link from the other two: `wasm/src/lib.rs` compiles to a
`.wasm` binary that's loaded directly into the browser tab and called like
an ordinary JavaScript function (`frontend/src/wasmStats.ts`). No network,
no serialization — the compiled Rust and the JavaScript runtime share
memory in the same process. It's used for the "live stats" readout that
updates instantly while you're still typing spec limits, before the app
ever asks the Python backend for the authoritative, fuller report.

If the Rust module isn't built (no Rust toolchain installed), `wasmStats.ts`
transparently falls back to a plain TypeScript implementation of the same
math, so the app is fully functional either way — only the "compiled and
shared-memory" part is optional.

## Quick start

**Prerequisites:** Python 3.10+, PostgreSQL running locally, Node.js 18+.
Rust + wasm-pack are optional (only needed for the compiled live-stats path).

```bash
cd data-analysis-studio
./start.sh
```

First run installs everything (needs internet once); after that, re-running
`./start.sh` is fast and works fully offline. It opens the app at
**http://localhost:8000**.

If you don't have PostgreSQL set up yet:

```bash
# macOS with Homebrew:
brew install postgresql@16
brew services start postgresql@16
```

`start.sh` will create the `data_analysis_studio` database for you if it
can find `createdb` on your PATH. If it can't, create it yourself:

```bash
createdb data_analysis_studio
```

By default it connects as your Mac username with no password (the common
local trust-auth setup). To point at a different database, set
`DATABASE_URL` before running `start.sh`:

```bash
export DATABASE_URL="postgresql+psycopg2://myuser:mypassword@localhost:5432/mydb"
./start.sh
```

### Auto-starting the server at login (macOS)

Running `start.sh` every time is only needed for setup or after editing the
backend. For day-to-day use, a `launchd` LaunchAgent can keep the FastAPI
server itself running in the background permanently — started at login,
and restarted automatically if it ever crashes:

```bash
# ~/Library/LaunchAgents/com.inui.data-analysis-studio.plist
# ProgramArguments: <repo>/backend/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000
# WorkingDirectory: <repo>/backend
# RunAtLoad: true, KeepAlive.SuccessfulExit: false, ThrottleInterval: 5
# StandardOutPath / StandardErrorPath: ~/Library/Logs/data-analysis-studio.log
launchctl load ~/Library/LaunchAgents/com.inui.data-analysis-studio.plist
```

With this loaded, `http://localhost:8000` is always up without needing a
terminal window open — check `~/Library/Logs/data-analysis-studio.log` if
it isn't responding. This only replaces running the server; you still run
`./start.sh` (or `cd frontend && npm run build`) after editing code, and
`launchctl unload`/`load` the same plist to pick up a restart.

## Using it

**The grid** (Data Grid tab) works like Excel: click a cell and type, or
paste a block copied from Excel/Sheets/Numbers and it expands to fit.
Select a range and copy it back out the same way. It only ever renders the
rows currently scrolled into view — the rest lives in Postgres and is
fetched a page at a time — so it stays smooth at tens of thousands of rows.
Add more datasets ("groups") from the sidebar for your own data, use
Import CSV, or use **Create Factorial Design** (Grid toolbar) to generate a
DOE worksheet directly.

**Charts** (Charts & Comparison tab) has four families, matching the
`<optgroup>`s in the chart-type dropdown:

- *General*: bar, line, radar, scatter, pie, doughnut. Compare within one
  group (optionally split by a category column) or across multiple groups
  at once — each group becomes its own series/color.
- *Manufacturing / SPC*: I-MR chart, Xbar-R chart, Xbar-S chart, a
  histogram with spec-limit shading plus Cp/Cpk/Pp/Ppk, a Pareto chart, the
  combined **Process Capability Sixpack** (Xbar/I chart, R/S/MR chart,
  histogram vs. spec, normal probability plot, capability summary, and a
  run chart of the last subgroups — one report, six panels), a boxplot, a
  normal probability plot, and a **Gauge R&R study** (operator/part
  variance decomposition, %contribution, and Number of Distinct Categories).
- *Statistical Tests*: descriptive statistics, 1-sample/2-sample/paired
  t-tests, one-way ANOVA, simple linear regression, and a correlation
  matrix — every one computed server-side with a hand-written
  Student's-t/F p-value implementation (no scipy dependency).
- *Design of Experiments*: "Create Factorial Design" generates a full
  two-level factorial (2-7 factors, optional center points and
  replicates) straight into a new worksheet so you can fill in real
  results in the grid; "Factorial Effects Analysis (DOE)" then estimates
  every main effect and interaction, and shows a Pareto-of-effects chart,
  a normal probability plot of the effects, an effects/coefficients
  table, and a curvature check when center points are present.

Every chart or analysis result opens as its own floating **graph window**
(auto-numbered Graph1/Graph2/..., the way Minitab does), listed in the
Project Manager sidebar's Graphs section alongside the Worksheets list —
click either to bring that window or sheet to the front.

As you pick a measurement column and type in spec limits for an SPC chart,
the small readout above the "Chart title" field updates instantly — that's
the Rust/WASM (or TypeScript fallback) live path, separate from the
Python-rendered chart itself.

**The Session tab** is a running, Minitab-style monospace transcript of
every analysis you've run this session (not persisted across reloads) —
useful for copy-pasting a result's exact numbers without reopening its
graph window.

## Project layout

```
data-analysis-studio/
  start.sh                         one-command setup + launch
  backend/
    app.py                         composition root: builds the FastAPI app,
                                    the JSON inf/nan safety net, mounts routers/
    routers/                       one file per endpoint cluster
      datasets.py                   dataset/row/column CRUD
      spc_capability.py             control-chart/capability/histogram/pareto/
                                     sixpack/descriptive-stats JSON endpoints
      inference.py                  t-tests/ANOVA/regression/correlation/
                                     normality/boxplot/Gauge R&R JSON endpoints
      doe.py                        doe-design/doe-effects/doe-optimize
      plots.py                      every /api/plot/* matplotlib PNG endpoint
      misc.py                       cross-dataset compare + /api/health
      _common_schemas.py            the handful of Pydantic models genuinely
                                     shared between an analysis router and plots.py
    stats/                         pure numpy/pandas engine, zero web/DB code
      _distributions.py             shared normal/t/F distribution math
      control_charts.py, capability.py, histogram.py, pareto.py,
      normal_probability_plot.py, sixpack.py                SPC
      descriptive.py, hypothesis_tests.py, regression.py,
      correlation.py, normality.py, boxplot.py, gauge_rr.py  inference
      doe_design.py, doe_effects.py, doe_optimize.py         DOE
    plotting/                      matplotlib chart rendering (matplotlib.use("Agg"))
      _style.py, _panels.py         shared colors/figure-saving + shared drawing panels
      category_chart.py, scatter_chart.py, control_chart.py, histogram_chart.py,
      pareto_chart.py, normal_probability_chart.py, sixpack_chart.py,
      regression_chart.py, boxplot_chart.py, gauge_rr_chart.py, doe_effects_chart.py
    models.py, db.py               SQLAlchemy <-> PostgreSQL (the Python <-> SQL link)
    schema.sql                     the raw SQL, if you want to read/run it directly
    requirements.txt
  frontend/
    src/
      main.ts                       composition root: wires every module's
                                     top-level event listeners, then boot()s
      boot.ts                        app startup + switchDataset()
      state.ts                       the handful of module-level app state
                                     (active dataset, grid instance, builder mode)
      sidebar.ts                     Worksheets list + Project Manager Graphs list
      tabs.ts                        the 3 top-level tab buttons
      grid-toolbar.ts                 add row/col, sort, CSV import/export, DOE button
      doe-form.ts                     "Create Factorial Design" form
      chart-builder-form.ts           chart-type field visibility, sheet/column
                                     selects, the live-stats preview
      window-card-helpers.ts          per-chart-kind window sizing + card helpers
      chart-dispatch/                 one file per chart-type-dropdown optgroup
        dispatch-core.ts               entry point + General charts
        dispatch-spc.ts                Manufacturing/SPC charts
        dispatch-inference.ts          Statistical Tests charts
        dispatch-doe.ts                Design of Experiments charts
      charts/                         chart rendering
        render-server-chart.ts         shared POST-to-/api/plot/*-and-show-<img> helper
        image-charts.ts                every server-rendered PNG chart renderer
        stat-cards.ts                  the plain-HTML numeric/text result panels
      session/                        the Session-log tab
        log.ts, formatters.ts          the transcript itself + per-analysis formatters
      grid.ts                         the virtualized Excel-like grid (one class, see
                                      its header comment for its internal sections)
      windows.ts                      floating "graph window" manager
      api/                           fetch wrapper around the FastAPI backend
        client.ts, datasets.ts, analysis.ts
      wasmStats.ts                    loads the WASM module (or falls back to TS)
      util/                          escapeHtml/uid, colLetter/num, CSV helpers
      types.ts                       shared TS interfaces mirroring the Pydantic
                                      models (see its header for the topic clusters)
      wasm-pkg/                      generated by `wasm-pack build` -- not in git
    index.html, styles.css
    package.json                     esbuild bundles everything into dist/bundle.js
  wasm/
    src/lib.rs                      fast client-side stats, compiled to WebAssembly
    Cargo.toml
```

Every `backend/stats/__init__.py` and `backend/plotting/__init__.py` re-export
their package's public functions, so existing qualified calls
(`stats.capability(...)`, `plotting.sixpack_chart(...)`) resolve exactly as
they did when each was a single file — splitting a module into a package
never required touching any of its callers. The same pattern applies on the
frontend: every `charts/`, `session/`, `util/`, and `api/` directory has an
`index.ts` barrel so existing `from "./charts"`-style imports elsewhere in
the app keep working unchanged.

## Rebuilding individual pieces

```bash
# Frontend only (after editing .ts files):
cd frontend && npm run build

# Type-check without emitting anything:
cd frontend && npm run typecheck

# Rust/WASM module (needs Rust + wasm-pack: https://rustwasm.github.io/wasm-pack/installer/):
cd wasm && wasm-pack build --target web --out-dir ../frontend/src/wasm-pkg
cd ../frontend && npm run build   # re-bundle so the built app picks it up

# Backend stats engine alone -- no server, no DB, just the math:
cd backend && python3 -c "
import stats
print(stats.imr_chart([10.1, 9.8, 10.3, 10.0, 9.9]))
"
```

## API reference (backend/routers/)

**Dataset CRUD** (`routers/datasets.py`):

| Method & path | Purpose |
|---|---|
| `GET /api/datasets` | List all datasets |
| `POST /api/datasets` | Create a dataset `{name, headers, rows}` |
| `PUT /api/datasets/{id}/rename` | Rename |
| `DELETE /api/datasets/{id}` | Delete |
| `GET /api/datasets/{id}/page?offset=&limit=` | Windowed rows, for the virtualized grid |
| `GET /api/datasets/{id}/column/{col_index}` | One full column, for chart-building |
| `PATCH /api/datasets/{id}/cells` | Bulk cell write (typing, paste) |
| `DELETE /api/datasets/{id}/rows/{row_index}` | Delete a row |
| `POST /api/datasets/{id}/columns` / `DELETE .../columns/{i}` | Add/remove a column |

**SPC / capability JSON** (`routers/spc_capability.py`):

| Method & path | Purpose |
|---|---|
| `POST /api/analysis/control-chart` | Xbar-R / Xbar-S / I-MR |
| `POST /api/analysis/capability` | Cp/Cpk/Pp/Ppk |
| `POST /api/analysis/histogram` | Binned counts + spec limits |
| `POST /api/analysis/pareto` | Sorted totals + cumulative % |
| `POST /api/analysis/sixpack` | All of the above in one call |
| `POST /api/analysis/normal-probability-plot` | Sorted data vs. theoretical normal quantiles |
| `POST /api/analysis/descriptive-stats` | N/mean/StDev/quartiles/min/max |

**Statistical inference JSON** (`routers/inference.py`):

| Method & path | Purpose |
|---|---|
| `POST /api/analysis/one-sample-ttest` | 1-sample t-test vs. a hypothesized mean |
| `POST /api/analysis/two-sample-ttest` | Independent 2-sample t-test |
| `POST /api/analysis/paired-ttest` | Paired t-test |
| `POST /api/analysis/anova` | One-way ANOVA |
| `POST /api/analysis/regression` | Simple linear regression |
| `POST /api/analysis/correlation` | Pearson correlation matrix + p-values |
| `POST /api/analysis/normality` | Anderson-Darling normality test |
| `POST /api/analysis/boxplot` | Boxplot summary stats, optionally grouped |
| `POST /api/analysis/gauge-rr` | Gauge R&R (operator/part ANOVA + variance components) |

**Design of Experiments JSON** (`routers/doe.py`):

| Method & path | Purpose |
|---|---|
| `POST /api/analysis/doe-design` | Generate a 2-level full factorial design (2-7 factors, center points, replicates) |
| `POST /api/analysis/doe-effects` | Estimate main effects/interactions, SS, %contribution, and curvature for a completed factorial experiment |
| `POST /api/analysis/doe-optimize` | Evaluate a fitted factorial model at every design corner and pick the best settings (backend only, no UI yet) |

**Chart images** (`routers/plots.py`) — every one of these returns `image/png`
bytes rendered server-side with matplotlib, mirroring the request shape of
its JSON twin above wherever one exists:

| Method & path |
|---|
| `POST /api/plot/category-chart` (bar/line/radar/pie/doughnut) |
| `POST /api/plot/scatter-chart` |
| `POST /api/plot/control-chart` |
| `POST /api/plot/histogram` |
| `POST /api/plot/pareto` |
| `POST /api/plot/normal-probability-plot` |
| `POST /api/plot/sixpack` |
| `POST /api/plot/regression` |
| `POST /api/plot/boxplot` |
| `POST /api/plot/gauge-rr` |
| `POST /api/plot/doe-effects` |

**Misc** (`routers/misc.py`): `POST /api/analysis/compare` (cross-group pivot,
computed in pandas server-side), `GET /api/health`.

## Troubleshooting

**"Couldn't start the app" in the browser** — the backend isn't reachable.
Check the terminal window `start.sh` is running in for errors (or
`~/Library/Logs/data-analysis-studio.log` if you're using the LaunchAgent),
and confirm PostgreSQL is actually running (`pg_isready` if you have it, or
just try `psql data_analysis_studio`).

**Frontend changes don't show up** — you edited a `.ts` file but the browser
is still serving the old `dist/bundle.js`. Run `npm run build` inside
`frontend/`, then hard-refresh the browser (the built files aren't
regenerated automatically unless you use `npm run dev` in another terminal
alongside `start.sh`).

**Port 8000 already in use** — something else is using it (possibly the
LaunchAgent, if you've set one up); stop that process, or edit the port in
the last line of `start.sh` (and update the URL you open in the browser to
match).
