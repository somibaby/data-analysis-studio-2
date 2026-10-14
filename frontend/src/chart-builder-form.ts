// chart-builder-form.ts — the Charts tab's form: chart-type dropdown,
// field show/hide rules per chart kind, sheet/column selects, and the
// live-stats preview strip. Exports the type classifiers (GeneralType,
// SpcType, isGeneral) that chart-dispatch/dispatch-core.ts needs to
// route a build request, plus selectedSheetIds() which the multi-sheet
// "compare" path in dispatch-core.ts reads. wireChartBuilderForm() takes
// switchDataset as a parameter (from boot.ts) only for the sheet-select
// handler -- see boot.ts's header comment on why this isn't a direct
// import.
import { fastImrLimits, fastCpk } from "./wasmStats";
import { escapeHtml, colLetter, num } from "./util";
import { datasets, activeDatasetId, grid, builderMode, activeDataset, setBuilderMode } from "./state";

export type GeneralType = "bar" | "line" | "radar" | "scatter" | "pie" | "doughnut";
export type SpcType = "imr" | "xbar_r" | "xbar_s" | "histogram_capability" | "pareto" | "sixpack"
  | "boxplot" | "probability_plot" | "gauge_rr"
  | "descriptive_stats" | "one_sample_t" | "two_sample_t" | "paired_t"
  | "one_way_anova" | "regression" | "correlation" | "doe_effects";

const TWO_SAMPLE_TYPES = new Set(["two_sample_t", "paired_t"]);
const NEEDS_COLUMN_VALUE = new Set([
  "imr", "xbar_r", "xbar_s", "histogram_capability", "sixpack", "boxplot", "probability_plot",
  "descriptive_stats", "one_sample_t", "two_sample_t", "paired_t", "gauge_rr",
]);

const GENERAL_TYPES = new Set(["bar", "line", "radar", "scatter", "pie", "doughnut"]);

export function isGeneral(t: string): t is GeneralType { return GENERAL_TYPES.has(t); }

export function currentChartType(): string {
  return (document.getElementById("selChartType") as HTMLSelectElement).value;
}

function updateFieldVisibility() {
  const t = currentChartType();
  const general = isGeneral(t);
  const isPieLike = t === "pie" || t === "doughnut";
  const isScatter = t === "scatter";
  const isPareto = t === "pareto";
  const needsSubgroup = t === "xbar_r" || t === "xbar_s" || t === "sixpack";
  const needsSpec = t === "histogram_capability" || t === "sixpack";
  const needsValueOnly = NEEDS_COLUMN_VALUE.has(t);
  const isRegression = t === "regression";
  const isCorrelation = t === "correlation";
  const isAnova = t === "one_way_anova";
  const isOneSampleT = t === "one_sample_t";
  const isTwoSampleOrPaired = TWO_SAMPLE_TYPES.has(t);
  const isGaugeRR = t === "gauge_rr";
  const isBoxplot = t === "boxplot";
  const isDoeEffects = t === "doe_effects";

  show("fieldModeToggle", general);
  show("fieldSingleSheet", true); // always need an active sheet to read columns from
  show("fieldMultiSheets", general && builderMode === "multi");
  show("fieldStacked", general && t === "bar");
  show("fieldX", general || isPareto || isRegression);
  show("fieldYMulti", (general && !isPieLike && !isScatter) || isCorrelation || isDoeEffects);
  show("fieldYSingle", (general && (isPieLike || isScatter)) || isPareto || needsValueOnly || isRegression || isAnova || isDoeEffects);
  show("fieldYSingle2", isTwoSampleOrPaired);
  show("fieldHypMean", isOneSampleT);
  show("fieldGaugePart", isGaugeRR);
  show("fieldGaugeOperator", isGaugeRR);
  show("fieldGroupBy", (general && builderMode === "single") || isAnova || isBoxplot);
  show("fieldAgg", general);
  show("fieldSubgroup", needsSubgroup);
  show("fieldSpecLimits", needsSpec);

  document.getElementById("selX")!.previousElementSibling!.textContent =
    isPareto ? "Category column (defect type, etc.)" : isRegression ? "Predictor (X) column" : "X axis / category column";
  document.getElementById("selYSingle")!.previousElementSibling!.textContent =
    isPareto ? "Value column (count / cost, etc.)"
    : isRegression ? "Response (Y) column"
    : isTwoSampleOrPaired ? (t === "paired_t" ? "First value column" : "First sample column")
    : isGaugeRR ? "Measurement column"
    : isDoeEffects ? "Response column"
    : needsValueOnly ? "Measurement column" : "Value column";
  document.getElementById("checkY")!.parentElement!.querySelector("label")!.textContent =
    isCorrelation ? "Columns to correlate" : isDoeEffects ? "Factor columns (2–7)" : "Value column(s) to plot as series";
  document.getElementById("yMultiHint")!.style.display = (isCorrelation || isDoeEffects) ? "none" : "";
  document.getElementById("selGroupBy")!.previousElementSibling!.textContent =
    isAnova ? "Factor (grouping) column" : isBoxplot ? "Split into groups by column (optional)" : "Split into groups by column (optional)";
}
function show(id: string, on: boolean) {
  document.getElementById(id)!.style.display = on ? "" : "none";
}

// NOTE: unreferenced by any caller as of the Oct 2026 restructuring's
// audit -- kept as-is (out of scope for a zero-behavior-change pass).
function headersOfActive(): string[] {
  return activeDataset()?.headers ?? [];
}

export function renderChartBuilder() {
  const ds = activeDataset();
  const sheets = datasets;

  const selSheet = document.getElementById("selSheet") as HTMLSelectElement;
  const prevSheet = selSheet.value;
  selSheet.innerHTML = sheets.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  selSheet.value = sheets.some((s) => String(s.id) === prevSheet) ? prevSheet : String(activeDatasetId);

  const checkSheets = document.getElementById("checkSheets")!;
  const prevChecked = new Set([...checkSheets.querySelectorAll<HTMLInputElement>("input:checked")].map((i) => i.value));
  checkSheets.innerHTML = sheets.map((s) => `<label><input type="checkbox" value="${s.id}" ${prevChecked.has(String(s.id)) || prevChecked.size === 0 ? "checked" : ""}> ${escapeHtml(s.name)}</label>`).join("");

  const headers = ds?.headers ?? [];
  const selX = document.getElementById("selX") as HTMLSelectElement;
  const prevX = selX.value;
  selX.innerHTML = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || colLetter(i))}</option>`).join("");
  if (headers[parseInt(prevX, 10)] !== undefined) selX.value = prevX;

  const checkY = document.getElementById("checkY")!;
  const prevY = new Set([...checkY.querySelectorAll<HTMLInputElement>("input:checked")].map((i) => i.value));
  checkY.innerHTML = headers.map((h, i) => `<label><input type="checkbox" value="${i}" ${prevY.has(String(i)) ? "checked" : ""}> ${escapeHtml(h || colLetter(i))}</label>`).join("");
  if (prevY.size === 0 && headers.length > 1) {
    const cb = checkY.querySelectorAll("input")[1] as HTMLInputElement | undefined;
    if (cb) cb.checked = true;
  }

  const selYSingle = document.getElementById("selYSingle") as HTMLSelectElement;
  const prevYS = selYSingle.value;
  selYSingle.innerHTML = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || colLetter(i))}</option>`).join("");
  if (headers[parseInt(prevYS, 10)] !== undefined) selYSingle.value = prevYS;
  else if (headers.length > 2) selYSingle.value = "2"; // pick a plausible numeric column by default
  else if (headers.length > 1) selYSingle.value = String(headers.length - 1); // narrow sheets: at least avoid colliding with selX's column-0 default

  const selYSingle2 = document.getElementById("selYSingle2") as HTMLSelectElement;
  const prevYS2 = selYSingle2.value;
  selYSingle2.innerHTML = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || colLetter(i))}</option>`).join("");
  if (headers[parseInt(prevYS2, 10)] !== undefined) selYSingle2.value = prevYS2;
  else if (headers.length > 3) selYSingle2.value = "3";

  const selGaugePart = document.getElementById("selGaugePart") as HTMLSelectElement;
  const prevGP = selGaugePart.value;
  selGaugePart.innerHTML = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || colLetter(i))}</option>`).join("");
  if (headers[parseInt(prevGP, 10)] !== undefined) selGaugePart.value = prevGP;

  const selGaugeOperator = document.getElementById("selGaugeOperator") as HTMLSelectElement;
  const prevGO = selGaugeOperator.value;
  selGaugeOperator.innerHTML = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || colLetter(i))}</option>`).join("");
  if (headers[parseInt(prevGO, 10)] !== undefined) selGaugeOperator.value = prevGO;
  else if (headers.length > 1) selGaugeOperator.value = "1";

  const selGroupBy = document.getElementById("selGroupBy") as HTMLSelectElement;
  const prevGB = selGroupBy.value;
  selGroupBy.innerHTML = '<option value="">— none —</option>' + headers.map((h, i) => `<option value="${i}">${escapeHtml(h || colLetter(i))}</option>`).join("");
  selGroupBy.value = prevGB && headers[parseInt(prevGB, 10)] !== undefined ? prevGB : "";

  updateFieldVisibility();
  updateLiveStats();
}

export function selectedSheetIds(): number[] {
  return [...document.querySelectorAll<HTMLInputElement>("#checkSheets input:checked")].map((i) => parseInt(i.value, 10));
}

// -------------------------------------------------------------- live stats
let liveStatsTimer: number | undefined;
function scheduleLiveStats() {
  window.clearTimeout(liveStatsTimer);
  liveStatsTimer = window.setTimeout(updateLiveStats, 200) as unknown as number;
}

async function updateLiveStats() {
  const panel = document.getElementById("liveStatsPanel")!;
  const t = currentChartType();
  const needsValueOnly = t === "imr" || t === "xbar_r" || t === "xbar_s" || t === "histogram_capability" || t === "sixpack";
  if (!needsValueOnly || !activeDatasetId) { panel.style.display = "none"; return; }
  const yIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  if (isNaN(yIdx)) { panel.style.display = "none"; return; }
  panel.style.display = "";
  panel.innerHTML = `<span class="live-loading">computing…</span>`;
  const colVals = (await grid.getColumnValues(yIdx)).map(num).filter((v): v is number => v !== null);
  if (colVals.length < 2) { panel.innerHTML = `<span class="live-loading">not enough numeric data yet</span>`; return; }

  const lsl = num((document.getElementById("inpLsl") as HTMLInputElement).value);
  const usl = num((document.getElementById("inpUsl") as HTMLInputElement).value);

  let html = "";
  const imr = fastImrLimits(colVals);
  if (!imr.error) {
    html += `<span><b>x̄</b> ${imr.center.toFixed(3)}</span><span><b>UCL</b> ${imr.ucl.toFixed(3)}</span><span><b>LCL</b> ${imr.lcl.toFixed(3)}</span>`;
  }
  if (lsl !== null && usl !== null) {
    const cpk = fastCpk(colVals, lsl, usl);
    if (!cpk.error) html += `<span><b>Cpk</b> ${cpk.cpk.toFixed(3)}</span>`;
  }
  panel.innerHTML = html || `<span class="live-loading">—</span>`;
}

export function wireChartBuilderForm(switchDataset: (id: number) => Promise<void>) {
  document.querySelectorAll("#segMode button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#segMode button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setBuilderMode((btn as HTMLElement).dataset.mode as "single" | "multi");
      updateFieldVisibility();
    });
  });

  document.getElementById("selChartType")!.addEventListener("change", updateFieldVisibility);

  document.getElementById("selSheet")!.addEventListener("change", () => {
    const id = parseInt((document.getElementById("selSheet") as HTMLSelectElement).value, 10);
    if (!isNaN(id)) switchDataset(id).then(renderChartBuilder);
  });

  ["selYSingle", "inpLsl", "inpUsl", "inpSubgroupSize", "selChartType"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", scheduleLiveStats);
    document.getElementById(id)?.addEventListener("change", scheduleLiveStats);
  });
}
