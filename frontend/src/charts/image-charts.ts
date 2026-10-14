// image-charts.ts — every actual "chart" (bar/line/radar/pie/scatter/
// control charts/histogram/pareto/sixpack/regression/boxplot/Gauge R&R
// contribution/DOE effects pareto) is a server-rendered matplotlib PNG
// fetched from a POST /api/plot/* endpoint via renderServerChart() and
// dropped into the page as a plain <img> -- Chart.js and <canvas> are
// gone.
import { escapeHtml } from "../util";
import type { CapabilityResult } from "../types";
import { renderServerChart } from "./render-server-chart";

export interface PivotData { categories: (string | number)[]; seriesNames: string[]; matrix: (number | null)[][]; }

// ---------------------------------------------------------------------
// General comparison charts (bar / line / radar / scatter / pie / doughnut)
// ---------------------------------------------------------------------
export async function renderCategoryChart(
  container: HTMLElement,
  type: "bar" | "line" | "radar" | "pie" | "doughnut",
  data: PivotData,
  opts: { title: string; xLabel?: string; yLabel?: string; stacked?: boolean }
): Promise<void> {
  await renderServerChart(container, "/api/plot/category-chart", {
    chart_type: type,
    categories: data.categories,
    series_names: data.seriesNames,
    matrix: data.matrix,
    title: opts.title,
    x_label: opts.xLabel ?? "",
    y_label: opts.yLabel ?? "",
    stacked: !!opts.stacked,
  });
}

export async function renderScatterChart(
  container: HTMLElement,
  series: { name: string; points: { x: number; y: number }[] }[],
  opts: { title: string; xLabel?: string; yLabel?: string }
): Promise<void> {
  await renderServerChart(container, "/api/plot/scatter-chart", {
    series,
    title: opts.title,
    x_label: opts.xLabel ?? "",
    y_label: opts.yLabel ?? "",
  });
}

// ---------------------------------------------------------------------
// SPC: control charts (Xbar-R / Xbar-S / I-MR) -- one combined two-panel
// PNG from the backend, which recomputes the control limits itself
// (stats/ package) from the same raw values/chart_type/subgroup_size.
// ---------------------------------------------------------------------
export async function renderControlChart(
  container: HTMLElement, values: number[], chartType: "xbar_r" | "xbar_s" | "imr", subgroupSize: number
): Promise<void> {
  await renderServerChart(container, "/api/plot/control-chart", {
    values, chart_type: chartType, subgroup_size: subgroupSize,
  });
}

// ---------------------------------------------------------------------
// SPC: histogram with spec-limit-colored bars
// ---------------------------------------------------------------------
export async function renderHistogram(
  container: HTMLElement,
  opts: { values: number[]; bins?: number; lsl: number | null; usl: number | null; target: number | null; title?: string }
): Promise<void> {
  await renderServerChart(container, "/api/plot/histogram", {
    values: opts.values, bins: opts.bins ?? 12, lsl: opts.lsl, usl: opts.usl, target: opts.target,
    title: opts.title ?? "Histogram",
  });
}

// ---------------------------------------------------------------------
// Pareto (bars + cumulative % line, dual axis)
// ---------------------------------------------------------------------
export async function renderPareto(
  container: HTMLElement, categories: string[], values: number[], title = "Pareto Chart"
): Promise<void> {
  await renderServerChart(container, "/api/plot/pareto", { categories, values, title });
}

// ---------------------------------------------------------------------
// Normal probability plot (scatter of sorted data vs theoretical quantiles
// + a fitted straight line). Also reused, unchanged, for the DOE
// normal-effects plot -- the caller just passes the effect estimates as
// `values`; stats.normal_probability_plot() sorts/ranks them the same way
// it would raw data.
// ---------------------------------------------------------------------
export async function renderNormalProbabilityPlot(container: HTMLElement, values: number[]): Promise<void> {
  await renderServerChart(container, "/api/plot/normal-probability-plot", { values });
}

// ---------------------------------------------------------------------
// Sixpack: builds the panel layout (one combined chart image + the
// existing HTML capability-tile grid) and renders both.
// ---------------------------------------------------------------------
export async function renderSixpack(
  container: HTMLElement,
  _cap: CapabilityResult,
  plotParams: { values: number[]; subgroup_size: number; lsl: number | null; usl: number | null; target: number | null },
  title?: string
): Promise<void> {
  // The capability numbers (LSL/USL/Cp/Cpk/etc.) are drawn directly into
  // the sixpack image's own sixth panel (see backend/plotting/sixpack_chart.py
  // -> _draw_capability_summary), matching Minitab's actual sixpack
  // report -- one image, six panels, no separate side card needed.
  container.innerHTML = `
    ${title ? `<div class="sixpack-title">${escapeHtml(title)}</div>` : ""}
    <div class="sixpack-img" id="sp-img"></div>`;
  await renderServerChart(container.querySelector("#sp-img") as HTMLElement, "/api/plot/sixpack", plotParams);
}

export async function renderRegressionChart(
  container: HTMLElement, x: number[], y: number[], xLabel: string, yLabel: string
): Promise<void> {
  await renderServerChart(container, "/api/plot/regression", { x, y, x_label: xLabel, y_label: yLabel });
}

export async function renderBoxplot(
  container: HTMLElement, values: number[], groups: string[] | null, opts: { title: string; yLabel?: string }
): Promise<void> {
  await renderServerChart(container, "/api/plot/boxplot", {
    values, groups, title: opts.title, y_label: opts.yLabel ?? "Value",
  });
}

export async function renderGaugeRRContributionChart(
  container: HTMLElement, parts: string[], operators: string[], measurements: number[]
): Promise<void> {
  await renderServerChart(container, "/api/plot/gauge-rr", { parts, operators, measurements });
}

// ---------------------------------------------------------------------
// Design of Experiments (DOE): Pareto-of-effects chart. The normal
// probability plot of the effects reuses renderNormalProbabilityPlot()
// above directly -- the caller just passes the effect estimates as
// `values` (see chart-dispatch/dispatch-doe.ts).
// ---------------------------------------------------------------------
export async function renderEffectsParetoChart(
  container: HTMLElement, factorNames: string[], design: number[][], responses: number[]
): Promise<void> {
  await renderServerChart(container, "/api/plot/doe-effects", { factor_names: factorNames, design, responses });
}
