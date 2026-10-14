// dispatch-inference.ts — chart builders for the "Statistical Tests"
// optgroup in index.html's chart-type select: Descriptive Statistics,
// 1/2-Sample and Paired t-Tests, One-Way ANOVA, Simple Linear Regression,
// and Correlation Matrix. Called by dispatchSpcChart() in dispatch-core.ts.
import { api } from "../api";
import {
  renderAnovaCard, renderRegressionChart, renderRegressionCoefficientsCard,
  renderCorrelationMatrixTable, renderDescriptiveStatsCard, renderOneSampleTTestCard,
  renderTwoSampleTTestCard, renderPairedTTestCard,
} from "../charts";
import { grid, activeDataset } from "../state";
import { num } from "../util";
import {
  logToSession, formatAnova, formatRegression, formatCorrelation,
  formatDescriptiveStats, formatOneSampleT, formatTwoSampleT, formatPairedT,
} from "../session";
import { addPanelCard } from "../window-card-helpers";
import { colName } from "./dispatch-core";

export async function buildAnovaChart(title: string) {
  const ds = activeDataset()!;
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const gIdx = parseInt((document.getElementById("selGroupBy") as HTMLSelectElement).value, 10);
  if (isNaN(gIdx)) throw new Error("Choose a factor (grouping) column for ANOVA.");
  const rows = await grid.getAllRows();
  const groups: Record<string, number[]> = {};
  rows.forEach((r) => {
    const v = num(r[yIdx]);
    if (v === null) return;
    const g = String(r[gIdx] ?? "(blank)");
    (groups[g] ??= []).push(v);
  });
  const result = await api.anova(groups);
  const card = addPanelCard(title, "anova");
  renderAnovaCard(card, result);
  logToSession(title, formatAnova(colName(ds, yIdx), colName(ds, gIdx), result));
}

export async function buildRegressionChart(title: string) {
  const ds = activeDataset()!;
  const xIdx = parseInt((document.getElementById("selX") as HTMLSelectElement).value, 10);
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const rows = await grid.getAllRows();
  const pts = rows.map((r) => ({ x: num(r[xIdx]), y: num(r[yIdx]) })).filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
  const result = await api.regression(pts.map((p) => p.x), pts.map((p) => p.y));
  const card = addPanelCard(title, "regression");
  card.innerHTML = `<div class="hist-cap-layout"><div class="hist-cap-chart"></div><div class="hist-cap-card"></div></div>`;
  await renderRegressionChart(card.querySelector(".hist-cap-chart") as HTMLElement, pts.map((p) => p.x), pts.map((p) => p.y), colName(ds, xIdx), colName(ds, yIdx));
  renderRegressionCoefficientsCard(card.querySelector(".hist-cap-card") as HTMLElement, result);
  logToSession(title, formatRegression(colName(ds, xIdx), colName(ds, yIdx), result));
}

export async function buildCorrelationChart(title: string) {
  const ds = activeDataset()!;
  const yIdxs = [...document.querySelectorAll<HTMLInputElement>("#checkY input:checked")].map((i) => parseInt(i.value, 10));
  if (yIdxs.length < 2) throw new Error("Check at least 2 columns to correlate.");
  const rows = await grid.getAllRows();
  const columns: Record<string, number[]> = {};
  yIdxs.forEach((idx) => { columns[colName(ds, idx)] = rows.map((r) => num(r[idx])).filter((v): v is number => v !== null); });
  const result = await api.correlation(columns);
  const card = addPanelCard(title, "correlation");
  renderCorrelationMatrixTable(card, result);
  logToSession(title, formatCorrelation(result));
}

export async function buildTwoSampleOrPairedTChart(t: "two_sample_t" | "paired_t", title: string) {
  const ds = activeDataset()!;
  const y1Idx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const y2Idx = parseInt((document.getElementById("selYSingle2") as HTMLSelectElement).value, 10);
  const name1 = colName(ds, y1Idx), name2 = colName(ds, y2Idx);
  if (t === "paired_t") {
    const rows = await grid.getAllRows();
    const pairs = rows.map((r) => [num(r[y1Idx]), num(r[y2Idx])]).filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
    if (pairs.length < 2) throw new Error("Not enough complete paired rows for a paired t-test.");
    const result = await api.pairedTtest(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
    const card = addPanelCard(title, "paired_t");
    renderPairedTTestCard(card, result, name1, name2);
    logToSession(title, formatPairedT(name1, name2, result));
  } else {
    const s1 = (await grid.getColumnValues(y1Idx)).map(num).filter((v): v is number => v !== null);
    const s2 = (await grid.getColumnValues(y2Idx)).map(num).filter((v): v is number => v !== null);
    const result = await api.twoSampleTtest(s1, s2);
    const card = addPanelCard(title, "two_sample_t");
    renderTwoSampleTTestCard(card, result, name1, name2);
    logToSession(title, formatTwoSampleT(name1, name2, result));
  }
}

export async function buildDescriptiveStatsChart(title: string) {
  const ds = activeDataset()!;
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const result = await api.descriptiveStats(values);
  const card = addPanelCard(title, "descriptive_stats");
  renderDescriptiveStatsCard(card, result, colName(ds, yIdx));
  logToSession(title, formatDescriptiveStats(colName(ds, yIdx), result));
}

export async function buildOneSampleTChart(title: string) {
  const ds = activeDataset()!;
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const values = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (values.length < 2) throw new Error("Not enough numeric data in that column.");
  const hyp = num((document.getElementById("inpHypMean") as HTMLInputElement).value) ?? 0;
  const result = await api.oneSampleTtest(values, hyp);
  const card = addPanelCard(title, "one_sample_t");
  renderOneSampleTTestCard(card, result);
  logToSession(title, formatOneSampleT(colName(ds, yIdx), result));
}
