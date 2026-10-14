// dispatch-core.ts — the "Generate" button's entry point. buildAndAddChart()
// reads the current chart-type select and routes to either
// buildGeneralChart() (bar/line/radar/scatter/pie/doughnut, handled here)
// or dispatchSpcChart(), a thin router that calls the per-kind builder
// functions split across dispatch-spc.ts, dispatch-inference.ts, and
// dispatch-doe.ts -- each matching one <optgroup> in index.html's
// chart-type <select>. colName() is the one small helper those three
// files share (do not duplicate it into a consumer module).
import { api } from "../api";
import { renderCategoryChart, renderScatterChart } from "../charts";
import type { PivotData } from "../charts";
import { datasets, grid, builderMode, activeDataset } from "../state";
import { colLetter, num } from "../util";
import type { DatasetSummary } from "../types";
import { currentChartType, isGeneral, selectedSheetIds } from "../chart-builder-form";
import type { GeneralType, SpcType } from "../chart-builder-form";
import { addChartCard } from "../window-card-helpers";
import {
  buildParetoChart, buildSixpackChart, buildHistogramCapabilityChart, buildControlChart,
  buildBoxplotChart, buildProbabilityPlotChart, buildGaugeRRChart,
} from "./dispatch-spc";
import {
  buildAnovaChart, buildRegressionChart, buildCorrelationChart, buildTwoSampleOrPairedTChart,
  buildDescriptiveStatsChart, buildOneSampleTChart,
} from "./dispatch-inference";
import { buildDoeEffectsChart } from "./dispatch-doe";

export function colName(ds: DatasetSummary, idx: number): string {
  return ds.headers[idx] || colLetter(idx);
}

export function wireGenerateButton() {
  document.getElementById("btnGenerate")!.addEventListener("click", async () => {
    const btn = document.getElementById("btnGenerate") as HTMLButtonElement;
    btn.disabled = true;
    try {
      await buildAndAddChart();
    } catch (err: any) {
      console.error(err);
      alert("Could not build chart: " + (err?.message ?? err));
    } finally {
      btn.disabled = false;
    }
  });
}

async function buildAndAddChart() {
  const t = currentChartType();
  const title = (document.getElementById("inpTitle") as HTMLInputElement).value || defaultTitle(t);

  if (isGeneral(t)) {
    await buildGeneralChart(t, title);
    return;
  }
  await dispatchSpcChart(t as SpcType, title);
}

async function dispatchSpcChart(t: SpcType, title: string): Promise<void> {
  if (t === "pareto") return buildParetoChart(title);
  if (t === "one_way_anova") return buildAnovaChart(title);
  if (t === "regression") return buildRegressionChart(title);
  if (t === "correlation") return buildCorrelationChart(title);
  if (t === "doe_effects") return buildDoeEffectsChart(title);
  if (t === "gauge_rr") return buildGaugeRRChart(title);
  if (t === "two_sample_t" || t === "paired_t") return buildTwoSampleOrPairedTChart(t, title);
  if (t === "descriptive_stats") return buildDescriptiveStatsChart(title);
  if (t === "one_sample_t") return buildOneSampleTChart(title);
  if (t === "boxplot") return buildBoxplotChart(title);
  if (t === "probability_plot") return buildProbabilityPlotChart(title);
  if (t === "sixpack") return buildSixpackChart(title);
  if (t === "histogram_capability") return buildHistogramCapabilityChart(title);
  return buildControlChart(t, title); // imr | xbar_r | xbar_s
}

/** Fetch every row of an arbitrary dataset directly from the API, paging
 * through it. Deliberately does NOT go through the Grid class -- Grid
 * wires up document/window-level event listeners in its constructor
 * (selection, copy/paste, keyboard nav), so creating throwaway Grid
 * instances just to read data would leak listeners on every call. */
async function fetchAllRowsForDataset(id: number): Promise<{ headers: string[]; rows: string[][] }> {
  const PAGE = 500;
  let offset = 0;
  let headers: string[] = [];
  const out: string[][] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await api.getPage(id, offset, PAGE);
    headers = page.headers;
    page.rows.forEach((row) => out.push(row.map((v) => (v === null || v === undefined ? "" : String(v)))));
    offset += page.rows.length;
    if (page.rows.length === 0 || offset >= page.total) break;
  }
  return { headers, rows: out };
}

async function localPivotSingle(): Promise<PivotData> {
  const ds = activeDataset()!;
  const xIdx = parseInt((document.getElementById("selX") as HTMLSelectElement).value, 10);
  const t = currentChartType();
  const isPie = t === "pie" || t === "doughnut";
  const yIdxs = isPie
    ? [parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10)]
    : [...document.querySelectorAll<HTMLInputElement>("#checkY input:checked")].map((i) => parseInt(i.value, 10));
  if (!yIdxs.length) throw new Error("Choose at least one value column.");
  const groupBy = (document.getElementById("selGroupBy") as HTMLSelectElement).value;
  const method = (document.getElementById("selAgg") as HTMLSelectElement).value;

  const allRows = await grid.getAllRows();
  const xVals = allRows.map((r) => r[xIdx] ?? "");
  const categories: (string | number)[] = [];
  const seen = new Set<string>();
  xVals.forEach((x) => { if (!seen.has(x)) { seen.add(x); categories.push(x); } });

  let seriesNames: string[];
  let matrix: (number | null)[][];
  if (groupBy !== "") {
    const gIdx = parseInt(groupBy, 10);
    const yIdx = yIdxs[0];
    const gVals = allRows.map((r) => r[gIdx] ?? "");
    seriesNames = [];
    const gseen = new Set<string>();
    gVals.forEach((g) => { if (!gseen.has(g)) { gseen.add(g); seriesNames.push(g); } });
    matrix = seriesNames.map((gName) =>
      categories.map((cat) => aggregate(allRows.filter((r, i) => xVals[i] === cat && gVals[i] === gName).map((r) => num(r[yIdx])), method))
    );
  } else {
    seriesNames = yIdxs.map((i) => ds.headers[i] || colLetter(i));
    matrix = yIdxs.map((yIdx) =>
      categories.map((cat) => aggregate(allRows.filter((r, i) => xVals[i] === cat).map((r) => num(r[yIdx])), method))
    );
  }
  return { categories, seriesNames, matrix };
}

function aggregate(vals: (number | null)[], method: string): number | null {
  const v = vals.filter((x): x is number => x !== null);
  if (method === "count") return vals.length;
  if (!v.length) return null;
  switch (method) {
    case "sum": return v.reduce((a, b) => a + b, 0);
    case "min": return Math.min(...v);
    case "max": return Math.max(...v);
    default: return v.reduce((a, b) => a + b, 0) / v.length;
  }
}

function defaultTitle(t: string): string {
  const names: Record<string, string> = {
    imr: "I-MR Chart", xbar_r: "Xbar-R Chart", xbar_s: "Xbar-S Chart",
    histogram_capability: "Histogram & Capability", pareto: "Pareto Chart", sixpack: "Process Capability Sixpack",
    boxplot: "Boxplot", probability_plot: "Normal Probability Plot", gauge_rr: "Gauge R&R Study",
    descriptive_stats: "Descriptive Statistics", one_sample_t: "1-Sample t-Test",
    two_sample_t: "2-Sample t-Test", paired_t: "Paired t-Test", one_way_anova: "One-Way ANOVA",
    regression: "Regression", correlation: "Correlation Matrix",
    doe_effects: "Factorial Design: Effects Analysis",
  };
  if (names[t]) return names[t];

  // General charts (bar/line/radar/scatter/pie/doughnut) have no single
  // fixed name to fall back on -- without this, every one of them defaults
  // to the bare word "Chart", so a second or third chart is indistinguishable
  // from the first (they'd all show up as "Chart (Graph1)", "Chart (Graph2)",
  // ...). Read whatever column(s) are currently selected in the builder
  // panel instead, so the default title actually says what's being plotted.
  const typeLabel: Record<string, string> = {
    bar: "Bar Chart", line: "Line Chart", radar: "Radar Chart",
    scatter: "Scatterplot", pie: "Pie Chart", doughnut: "Doughnut Chart",
  };
  const label = typeLabel[t] || "Chart";
  const ds = activeDataset();
  if (!ds) return label;
  const colNameLocal = (idx: number) => ds.headers[idx] || colLetter(idx);

  if (t === "scatter") {
    const xIdx = parseInt((document.getElementById("selX") as HTMLSelectElement)?.value ?? "", 10);
    const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement)?.value ?? "", 10);
    return !isNaN(xIdx) && !isNaN(yIdx) ? `${label} — ${colNameLocal(yIdx)} vs ${colNameLocal(xIdx)}` : label;
  }
  if (t === "pie" || t === "doughnut") {
    const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement)?.value ?? "", 10);
    return isNaN(yIdx) ? label : `${label} — ${colNameLocal(yIdx)}`;
  }
  const checked = [...document.querySelectorAll<HTMLInputElement>("#checkY input:checked")].map((i) => parseInt(i.value, 10));
  if (checked.length) return `${label} — ${checked.map(colNameLocal).join(", ")}`;
  return label;
}

async function buildGeneralChart(t: GeneralType, title: string) {
  const ds = activeDataset()!;
  const xIdx = parseInt((document.getElementById("selX") as HTMLSelectElement).value, 10);
  const xLabel = ds.headers[xIdx];

  if (t === "scatter") {
    const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
    const yLabel = ds.headers[yIdx];
    let series: { name: string; points: { x: number; y: number }[] }[];
    if (builderMode === "single") {
      const rows = await grid.getAllRows();
      const groupBy = (document.getElementById("selGroupBy") as HTMLSelectElement).value;
      if (groupBy !== "") {
        const gIdx = parseInt(groupBy, 10);
        const groups = new Map<string, { x: number; y: number }[]>();
        rows.forEach((r) => {
          const x = num(r[xIdx]), y = num(r[yIdx]);
          if (x === null || y === null) return;
          const g = r[gIdx] ?? "(blank)";
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push({ x, y });
        });
        series = [...groups.entries()].map(([name, points]) => ({ name, points }));
      } else {
        const points = rows.map((r) => ({ x: num(r[xIdx]), y: num(r[yIdx]) })).filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
        series = [{ name: ds.name, points }];
      }
    } else {
      const ids = selectedSheetIds();
      if (ids.length < 2) throw new Error("Select at least 2 groups to compare.");
      const chosen = datasets.filter((d) => ids.includes(d.id));
      series = [];
      for (const d of chosen) {
        const { headers, rows } = await fetchAllRowsForDataset(d.id);
        const xi = headers.indexOf(ds.headers[xIdx]);
        const yi = headers.indexOf(ds.headers[yIdx]);
        const points = xi === -1 || yi === -1 ? [] : rows.map((r) => ({ x: num(r[xi]), y: num(r[yi]) })).filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
        series.push({ name: d.name, points });
      }
    }
    const container = addChartCard(title, "scatter");
    await renderScatterChart(container, series, { title, xLabel, yLabel });
    return;
  }

  let pivot: PivotData;
  if (builderMode === "single") {
    pivot = await localPivotSingle();
  } else {
    const ids = selectedSheetIds();
    if (ids.length < 2) throw new Error("Select at least 2 groups to compare.");
    const isPie = t === "pie" || t === "doughnut";
    const yIdx = isPie
      ? parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10)
      : parseInt((document.querySelector<HTMLInputElement>("#checkY input:checked")?.value ?? (document.getElementById("selYSingle") as HTMLSelectElement).value), 10);
    const yLabel = ds.headers[yIdx];
    const method = (document.getElementById("selAgg") as HTMLSelectElement).value;
    const result = await api.compare(ids, xLabel, yLabel, method);
    pivot = { categories: result.categories, seriesNames: result.series_names, matrix: result.matrix };
  }

  const stacked = (document.getElementById("chkStacked") as HTMLInputElement).checked;
  const container = addChartCard(title, t);
  await renderCategoryChart(container, t, pivot, { title, xLabel, yLabel: "", stacked });
}
