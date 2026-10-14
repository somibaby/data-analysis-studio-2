// dispatch-spc.ts — chart builders for the "Manufacturing / SPC" optgroup
// in index.html's chart-type select: Pareto, Sixpack, Histogram+Capability,
// the I-MR/Xbar-R/Xbar-S control charts, Boxplot, Normal Probability Plot,
// and Gauge R&R. Each function reads whatever inputs it needs straight
// from the DOM (same pattern as the rest of the chart builder) and is
// called by dispatchSpcChart() in dispatch-core.ts.
import { api } from "../api";
import {
  renderPareto, renderSixpack, renderHistogram, renderCapabilityCard, renderControlChart,
  renderBoxplot, renderNormalProbabilityPlot, renderNormalityCard,
  renderGaugeRRContributionChart, renderGaugeRRTable,
} from "../charts";
import { grid, activeDataset } from "../state";
import { num } from "../util";
import { logToSession, formatPareto, formatCapability, formatBoxplot, formatNormality, formatGaugeRR } from "../session";
import { addChartCard, addPanelCard } from "../window-card-helpers";
import { colName } from "./dispatch-core";

export async function buildParetoChart(title: string) {
  const ds = activeDataset()!;
  const xIdx = parseInt((document.getElementById("selX") as HTMLSelectElement).value, 10);
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const rows = await grid.getAllRows();
  const categories = rows.map((r) => String(r[xIdx] ?? ""));
  const values = rows.map((r) => num(r[yIdx]) ?? 0);
  const result = await api.pareto(categories, values);
  const container = addChartCard(title, "pareto");
  await renderPareto(container, categories, values, title);
  logToSession(title, formatPareto(colName(ds, yIdx), result));
}

export async function buildSixpackChart(title: string) {
  const ds = activeDataset()!;
  const subgroupSize = parseInt((document.getElementById("inpSubgroupSize") as HTMLInputElement).value || "5", 10);
  const lsl = num((document.getElementById("inpLsl") as HTMLInputElement).value);
  const usl = num((document.getElementById("inpUsl") as HTMLInputElement).value);
  const target = num((document.getElementById("inpTarget") as HTMLInputElement).value);
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const result = await api.sixpack(values, subgroupSize, lsl, usl, target);
  const card = addPanelCard(title, "sixpack");
  await renderSixpack(card, result.capability, { values, subgroup_size: subgroupSize, lsl, usl, target }, `${title} — ${colName(ds, yIdx)}`);
  logToSession(title, formatCapability(colName(ds, yIdx), result.capability));
}

export async function buildHistogramCapabilityChart(title: string) {
  const ds = activeDataset()!;
  const lsl = num((document.getElementById("inpLsl") as HTMLInputElement).value);
  const usl = num((document.getElementById("inpUsl") as HTMLInputElement).value);
  const target = num((document.getElementById("inpTarget") as HTMLInputElement).value);
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const cap = await api.capability(values, lsl, usl, null, target);
  const card = addPanelCard(title, "histogram_capability");
  card.innerHTML = `<div class="hist-cap-layout"><div class="hist-cap-chart"></div><div class="hist-cap-card"></div></div>`;
  await renderHistogram(card.querySelector(".hist-cap-chart") as HTMLElement, { values, bins: 12, lsl, usl, target, title });
  renderCapabilityCard(card.querySelector(".hist-cap-card") as HTMLElement, cap);
  logToSession(title, formatCapability(colName(ds, yIdx), cap));
}

export async function buildBoxplotChart(title: string) {
  const ds = activeDataset()!;
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const gIdx = parseInt((document.getElementById("selGroupBy") as HTMLSelectElement).value, 10);
  let groups: string[] | null = null;
  let vals = values;
  if (!isNaN(gIdx)) {
    const rows = await grid.getAllRows();
    const pairs = rows.map((r) => ({ v: num(r[yIdx]), g: String(r[gIdx] ?? "") })).filter((p): p is { v: number; g: string } => p.v !== null);
    vals = pairs.map((p) => p.v);
    groups = pairs.map((p) => p.g);
  }
  const result = await api.boxplot(vals, groups);
  const container = addChartCard(title, "boxplot");
  await renderBoxplot(container, vals, groups, { title, yLabel: colName(ds, yIdx) });
  logToSession(title, formatBoxplot(colName(ds, yIdx), result));
}

export async function buildProbabilityPlotChart(title: string) {
  const ds = activeDataset()!;
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const result = await api.normalProbabilityPlot(values);
  const card = addPanelCard(title, "probability_plot");
  card.innerHTML = `<div class="hist-cap-layout"><div class="hist-cap-chart"></div><div class="hist-cap-card"></div></div>`;
  await renderNormalProbabilityPlot(card.querySelector(".hist-cap-chart") as HTMLElement, values);
  if (result.ad_test) {
    renderNormalityCard(card.querySelector(".hist-cap-card") as HTMLElement, result.ad_test);
    logToSession(title, formatNormality(colName(ds, yIdx), result.ad_test));
  }
}

export async function buildGaugeRRChart(title: string) {
  const partIdx = parseInt((document.getElementById("selGaugePart") as HTMLSelectElement).value, 10);
  const opIdx = parseInt((document.getElementById("selGaugeOperator") as HTMLSelectElement).value, 10);
  const measIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const ds = activeDataset()!;
  const rows = await grid.getAllRows();
  const parts: string[] = [], operators: string[] = [], measurements: number[] = [];
  rows.forEach((r) => {
    const v = num(r[measIdx]);
    if (v === null) return;
    parts.push(String(r[partIdx] ?? ""));
    operators.push(String(r[opIdx] ?? ""));
    measurements.push(v);
  });
  const result = await api.gaugeRR(parts, operators, measurements);
  const card = addPanelCard(title, "gauge_rr");
  card.innerHTML = `<div class="hist-cap-layout"><div class="hist-cap-chart"></div><div class="hist-cap-card"></div></div>`;
  await renderGaugeRRContributionChart(card.querySelector(".hist-cap-chart") as HTMLElement, parts, operators, measurements);
  renderGaugeRRTable(card.querySelector(".hist-cap-card") as HTMLElement, result);
  logToSession(title, formatGaugeRR(colName(ds, measIdx), result));
}

export async function buildControlChart(t: "imr" | "xbar_r" | "xbar_s", title: string) {
  const ds = activeDataset()!;
  const subgroupSize = parseInt((document.getElementById("inpSubgroupSize") as HTMLInputElement).value || "5", 10);
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const result = await api.controlChart(values, t, t === "imr" ? 1 : subgroupSize);
  const card = addPanelCard(title, "control_chart");
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  card.appendChild(container);
  await renderControlChart(container, values, t, t === "imr" ? 1 : subgroupSize);
  const primary = result.type === "imr" ? result.i : result.xbar;
  logToSession(title, `${result.type.toUpperCase()} Control Chart: ${colName(ds, yIdx)}\n\nCenter = ${primary.center.toFixed(4)}   UCL = ${primary.ucl.toFixed(4)}   LCL = ${primary.lcl.toFixed(4)}\nPoints out of control: ${primary.out_of_control.length ? primary.out_of_control.map((i) => i + 1).join(", ") : "none"}`);
}
