// stat-cards.ts — the numeric/text result panels (capability card,
// t-test/ANOVA/regression-coefficients cards, correlation matrix table,
// normality card, Gauge R&R table, DOE effects table) built as plain
// HTML from the JSON /api/analysis/* endpoints -- no chart image
// involved, these are rendered directly in the DOM.
import type {
  CapabilityResult, DescriptiveStatsResult, OneSampleTTestResult, TwoSampleTTestResult,
  PairedTTestResult, AnovaResult, RegressionResult, CorrelationResult,
  NormalityResult, GaugeRRResult, FactorialEffectsResult,
} from "../types";
import { escapeHtml } from "../util";

const OOC_COLOR = "#e0524b";

function sigGrade(p: number | null): { label: string; color: string } {
  if (p === null) return { label: "n/a", color: "#666e7d" };
  if (p < 0.05) return { label: "significant (p<0.05)", color: OOC_COLOR };
  return { label: "not significant", color: "#2ea043" };
}
const fmtN = (v: number | null | undefined, d = 4) => (v === null || v === undefined ? "—" : v.toFixed(d));

export function renderCapabilityCard(container: HTMLElement, cap: CapabilityResult) {
  const grade = (v: number | null) => {
    if (v === null) return { label: "n/a", color: "#666e7d" };
    if (v >= 1.33) return { label: "capable", color: "#2ea043" };
    if (v >= 1.0) return { label: "marginal", color: "#f2b705" };
    return { label: "not capable", color: "#e0524b" };
  };
  const cpk = grade(cap.cpk);
  const ppk = grade(cap.ppk);
  const fmt = (v: number | null, d = 3) => (v === null ? "—" : v.toFixed(d));
  container.innerHTML = `
    <div class="cap-grid">
      <div class="cap-stat"><div class="cap-label">LSL</div><div class="cap-value">${cap.lsl === null ? "—" : fmt(cap.lsl, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">Target</div><div class="cap-value">${cap.target === null ? "—" : fmt(cap.target, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">USL</div><div class="cap-value">${cap.usl === null ? "—" : fmt(cap.usl, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">Mean</div><div class="cap-value">${fmt(cap.mean, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">σ within</div><div class="cap-value">${fmt(cap.sigma_within, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">σ overall</div><div class="cap-value">${fmt(cap.sigma_overall, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">Cp</div><div class="cap-value">${fmt(cap.cp)}</div></div>
      <div class="cap-stat highlight" style="border-color:${cpk.color}">
        <div class="cap-label">Cpk</div><div class="cap-value" style="color:${cpk.color}">${fmt(cap.cpk)}</div>
        <div class="cap-grade" style="color:${cpk.color}">${cpk.label}</div>
      </div>
      <div class="cap-stat"><div class="cap-label">Pp</div><div class="cap-value">${fmt(cap.pp)}</div></div>
      <div class="cap-stat highlight" style="border-color:${ppk.color}">
        <div class="cap-label">Ppk</div><div class="cap-value" style="color:${ppk.color}">${fmt(cap.ppk)}</div>
        <div class="cap-grade" style="color:${ppk.color}">${ppk.label}</div>
      </div>
      <div class="cap-stat"><div class="cap-label">PPM &lt; LSL</div><div class="cap-value">${cap.ppm_below_lsl === null ? "—" : Math.round(cap.ppm_below_lsl)}</div></div>
      <div class="cap-stat"><div class="cap-label">PPM &gt; USL</div><div class="cap-value">${cap.ppm_above_usl === null ? "—" : Math.round(cap.ppm_above_usl)}</div></div>
    </div>`;
}

export function renderDescriptiveStatsCard(container: HTMLElement, d: DescriptiveStatsResult, columnName: string) {
  container.innerHTML = `
    <div class="cap-grid">
      <div class="cap-stat"><div class="cap-label">Variable</div><div class="cap-value" style="font-size:13px">${escapeHtml(columnName)}</div></div>
      <div class="cap-stat"><div class="cap-label">N</div><div class="cap-value">${d.n}</div></div>
      <div class="cap-stat"><div class="cap-label">Mean</div><div class="cap-value">${fmtN(d.mean)}</div></div>
      <div class="cap-stat"><div class="cap-label">SE Mean</div><div class="cap-value">${fmtN(d.se_mean)}</div></div>
      <div class="cap-stat"><div class="cap-label">StDev</div><div class="cap-value">${fmtN(d.stdev)}</div></div>
      <div class="cap-stat"><div class="cap-label">Min</div><div class="cap-value">${fmtN(d.min)}</div></div>
      <div class="cap-stat"><div class="cap-label">Q1</div><div class="cap-value">${fmtN(d.q1)}</div></div>
      <div class="cap-stat"><div class="cap-label">Median</div><div class="cap-value">${fmtN(d.median)}</div></div>
      <div class="cap-stat"><div class="cap-label">Q3</div><div class="cap-value">${fmtN(d.q3)}</div></div>
      <div class="cap-stat"><div class="cap-label">Max</div><div class="cap-value">${fmtN(d.max)}</div></div>
    </div>`;
}

export function renderOneSampleTTestCard(container: HTMLElement, r: OneSampleTTestResult) {
  const g = sigGrade(r.p_value);
  container.innerHTML = `
    <div class="ttest-grid">
      <div class="cap-stat"><div class="cap-label">N</div><div class="cap-value">${r.n}</div></div>
      <div class="cap-stat"><div class="cap-label">Mean</div><div class="cap-value">${fmtN(r.mean)}</div></div>
      <div class="cap-stat"><div class="cap-label">StDev</div><div class="cap-value">${fmtN(r.stdev)}</div></div>
      <div class="cap-stat"><div class="cap-label">SE Mean</div><div class="cap-value">${fmtN(r.se_mean)}</div></div>
      <div class="cap-stat"><div class="cap-label">${(r.confidence * 100).toFixed(0)}% CI</div><div class="cap-value" style="font-size:13px">(${fmtN(r.ci_lower)}, ${fmtN(r.ci_upper)})</div></div>
      <div class="cap-stat"><div class="cap-label">H0: mean =</div><div class="cap-value">${fmtN(r.hypothesized_mean, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">T-Value</div><div class="cap-value">${fmtN(r.t_value)}</div></div>
      <div class="cap-stat"><div class="cap-label">DF</div><div class="cap-value">${fmtN(r.df, 1)}</div></div>
      <div class="cap-stat highlight" style="border-color:${g.color}">
        <div class="cap-label">P-Value</div><div class="cap-value" style="color:${g.color}">${fmtN(r.p_value)}</div>
        <div class="cap-grade" style="color:${g.color}">${g.label}</div>
      </div>
    </div>`;
}

export function renderTwoSampleTTestCard(container: HTMLElement, r: TwoSampleTTestResult, name1: string, name2: string) {
  const g = sigGrade(r.p_value);
  container.innerHTML = `
    <table class="stat-table">
      <thead><tr><th>Sample</th><th>N</th><th>Mean</th><th>StDev</th><th>SE Mean</th></tr></thead>
      <tbody>
        <tr><td>${escapeHtml(name1)}</td><td>${r.n1}</td><td>${fmtN(r.mean1)}</td><td>${fmtN(r.stdev1)}</td><td>${fmtN(r.se_mean1)}</td></tr>
        <tr><td>${escapeHtml(name2)}</td><td>${r.n2}</td><td>${fmtN(r.mean2)}</td><td>${fmtN(r.stdev2)}</td><td>${fmtN(r.se_mean2)}</td></tr>
      </tbody>
    </table>
    <div class="ttest-grid" style="margin-top:10px;">
      <div class="cap-stat"><div class="cap-label">Difference</div><div class="cap-value">${fmtN(r.difference)}</div></div>
      <div class="cap-stat"><div class="cap-label">SE Difference</div><div class="cap-value">${fmtN(r.se_difference)}</div></div>
      <div class="cap-stat"><div class="cap-label">${(r.confidence * 100).toFixed(0)}% CI</div><div class="cap-value" style="font-size:13px">(${fmtN(r.ci_lower)}, ${fmtN(r.ci_upper)})</div></div>
      <div class="cap-stat"><div class="cap-label">T-Value</div><div class="cap-value">${fmtN(r.t_value)}</div></div>
      <div class="cap-stat"><div class="cap-label">DF</div><div class="cap-value">${fmtN(r.df, 1)}</div></div>
      <div class="cap-stat highlight" style="border-color:${g.color}">
        <div class="cap-label">P-Value</div><div class="cap-value" style="color:${g.color}">${fmtN(r.p_value)}</div>
        <div class="cap-grade" style="color:${g.color}">${g.label}</div>
      </div>
    </div>`;
}

export function renderPairedTTestCard(container: HTMLElement, r: PairedTTestResult, name1: string, name2: string) {
  const g = sigGrade(r.p_value);
  container.innerHTML = `
    <div class="helptext" style="margin-bottom:8px;">Paired difference: ${escapeHtml(name1)} − ${escapeHtml(name2)}</div>
    <div class="ttest-grid">
      <div class="cap-stat"><div class="cap-label">N Pairs</div><div class="cap-value">${r.n_pairs}</div></div>
      <div class="cap-stat"><div class="cap-label">Mean Diff</div><div class="cap-value">${fmtN(r.mean_difference)}</div></div>
      <div class="cap-stat"><div class="cap-label">StDev Diff</div><div class="cap-value">${fmtN(r.stdev_difference)}</div></div>
      <div class="cap-stat"><div class="cap-label">SE Mean</div><div class="cap-value">${fmtN(r.se_mean)}</div></div>
      <div class="cap-stat"><div class="cap-label">${(r.confidence * 100).toFixed(0)}% CI</div><div class="cap-value" style="font-size:13px">(${fmtN(r.ci_lower)}, ${fmtN(r.ci_upper)})</div></div>
      <div class="cap-stat"><div class="cap-label">T-Value</div><div class="cap-value">${fmtN(r.t_value)}</div></div>
      <div class="cap-stat"><div class="cap-label">DF</div><div class="cap-value">${fmtN(r.df, 1)}</div></div>
      <div class="cap-stat highlight" style="border-color:${g.color}">
        <div class="cap-label">P-Value</div><div class="cap-value" style="color:${g.color}">${fmtN(r.p_value)}</div>
        <div class="cap-grade" style="color:${g.color}">${g.label}</div>
      </div>
    </div>`;
}

export function renderAnovaCard(container: HTMLElement, r: AnovaResult) {
  const g = sigGrade(r.p_value);
  const groupRows = r.groups.map((gr) =>
    `<tr><td>${escapeHtml(gr.name)}</td><td>${gr.n}</td><td>${fmtN(gr.mean)}</td><td>${fmtN(gr.stdev)}</td></tr>`
  ).join("");
  container.innerHTML = `
    <table class="stat-table">
      <thead><tr><th>Level</th><th>N</th><th>Mean</th><th>StDev</th></tr></thead>
      <tbody>${groupRows}</tbody>
    </table>
    <table class="stat-table" style="margin-top:10px;">
      <thead><tr><th>Source</th><th>DF</th><th>SS</th><th>MS</th><th>F</th><th>P</th></tr></thead>
      <tbody>
        <tr><td>Factor</td><td>${r.factor_df}</td><td>${fmtN(r.factor_ss)}</td><td>${fmtN(r.factor_ms)}</td><td>${fmtN(r.f_value)}</td>
          <td style="color:${g.color};font-weight:700">${fmtN(r.p_value)}</td></tr>
        <tr><td>Error</td><td>${r.error_df}</td><td>${fmtN(r.error_ss)}</td><td>${fmtN(r.error_ms)}</td><td></td><td></td></tr>
        <tr><td>Total</td><td>${r.total_df}</td><td>${fmtN(r.total_ss)}</td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
    <div class="helptext" style="margin-top:8px;">R-sq = ${r.r_squared === null ? "—" : (r.r_squared * 100).toFixed(2) + "%"} &mdash; ${g.label}</div>`;
}

export function renderRegressionCoefficientsCard(container: HTMLElement, r: RegressionResult) {
  const gF = sigGrade(r.p_value_f);
  container.innerHTML = `
    <table class="stat-table">
      <thead><tr><th>Predictor</th><th>Coef</th><th>SE Coef</th><th>T</th><th>P</th></tr></thead>
      <tbody>
        <tr><td>Constant</td><td>${fmtN(r.intercept)}</td><td>${fmtN(r.se_intercept)}</td><td>${fmtN(r.t_intercept)}</td><td>${fmtN(r.p_intercept)}</td></tr>
        <tr><td>Slope</td><td>${fmtN(r.slope)}</td><td>${fmtN(r.se_slope)}</td><td>${fmtN(r.t_slope)}</td><td>${fmtN(r.p_slope)}</td></tr>
      </tbody>
    </table>
    <div class="cap-grid" style="margin-top:10px;">
      <div class="cap-stat"><div class="cap-label">R-sq</div><div class="cap-value">${r.r_squared === null ? "—" : (r.r_squared * 100).toFixed(2) + "%"}</div></div>
      <div class="cap-stat"><div class="cap-label">R-sq(adj)</div><div class="cap-value">${r.adj_r_squared === null ? "—" : (r.adj_r_squared * 100).toFixed(2) + "%"}</div></div>
      <div class="cap-stat"><div class="cap-label">S (SE)</div><div class="cap-value">${fmtN(r.se_regression)}</div></div>
      <div class="cap-stat highlight" style="border-color:${gF.color}">
        <div class="cap-label">F / P</div><div class="cap-value" style="color:${gF.color};font-size:15px">${fmtN(r.f_value)} / ${fmtN(r.p_value_f)}</div>
        <div class="cap-grade" style="color:${gF.color}">${gF.label}</div>
      </div>
    </div>`;
}

export function renderCorrelationMatrixTable(container: HTMLElement, r: CorrelationResult) {
  const header = r.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const rows = r.columns.map((rowName, i) => {
    const cells = r.columns.map((_, j) => {
      if (i === j) return `<td class="corr-diag">—</td>`;
      const rv = r.r[i][j], pv = r.p_value[i][j];
      const color = pv < 0.05 ? (rv > 0 ? "#2ea043" : OOC_COLOR) : "var(--text)";
      return `<td style="color:${color}"><b>${rv.toFixed(3)}</b><br><span style="font-size:10.5px;opacity:.75">(${pv.toFixed(3)})</span></td>`;
    }).join("");
    return `<tr><th>${escapeHtml(rowName)}</th>${cells}</tr>`;
  }).join("");
  container.innerHTML = `
    <table class="stat-table corr-table">
      <thead><tr><th></th>${header}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="helptext" style="margin-top:6px;">Pearson r, with p-value in parentheses. N = ${r.n}.</div>`;
}

export function renderNormalityCard(container: HTMLElement, r: NormalityResult) {
  const g = r.p_value >= 0.05 ? { label: "consistent with normal", color: "#2ea043" } : { label: "not normal (p<0.05)", color: OOC_COLOR };
  container.innerHTML = `
    <div class="cap-grid">
      <div class="cap-stat"><div class="cap-label">N</div><div class="cap-value">${r.n}</div></div>
      <div class="cap-stat"><div class="cap-label">Mean</div><div class="cap-value">${fmtN(r.mean, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">StDev</div><div class="cap-value">${fmtN(r.stdev, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">AD (A&sup2;)</div><div class="cap-value">${fmtN(r.a_squared_adjusted, 3)}</div></div>
      <div class="cap-stat highlight" style="border-color:${g.color};grid-column:span 2;">
        <div class="cap-label">P-Value</div><div class="cap-value" style="color:${g.color}">${fmtN(r.p_value)}</div>
        <div class="cap-grade" style="color:${g.color}">${g.label}</div>
      </div>
    </div>`;
}

export function renderGaugeRRTable(container: HTMLElement, r: GaugeRRResult) {
  const a = r.anova;
  const row = (name: string, s: { df: number; ss: number; ms: number; f?: number | null; p?: number | null }) =>
    `<tr><td>${name}</td><td>${s.df}</td><td>${fmtN(s.ss)}</td><td>${fmtN(s.ms)}</td><td>${s.f == null ? "" : fmtN(s.f)}</td><td>${s.p == null ? "" : fmtN(s.p)}</td></tr>`;
  const vc = r.variance_components;
  const vcRow = (name: string, c: { var: number; stdev: number; study_var: number; pct_contribution: number; pct_study_var: number }) =>
    `<tr><td>${name}</td><td>${fmtN(c.var)}</td><td>${fmtN(c.pct_contribution, 2)}%</td><td>${fmtN(c.stdev)}</td><td>${fmtN(c.study_var)}</td><td>${fmtN(c.pct_study_var, 2)}%</td></tr>`;
  const g = ndcGrade(r.ndc);
  container.innerHTML = `
    <table class="stat-table">
      <thead><tr><th>Source</th><th>DF</th><th>SS</th><th>MS</th><th>F</th><th>P</th></tr></thead>
      <tbody>
        ${row("Part", a.part)}
        ${row("Operator", a.operator)}
        ${row("Part &times; Operator", a.interaction)}
        ${row("Repeatability", a.error)}
        <tr><td>Total</td><td>${a.total.df}</td><td>${fmtN(a.total.ss)}</td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
    <table class="stat-table" style="margin-top:10px;">
      <thead><tr><th>Source</th><th>VarComp</th><th>%Contribution</th><th>StdDev</th><th>Study Var</th><th>%Study Var</th></tr></thead>
      <tbody>
        ${vcRow("Total Gauge R&amp;R", vc.total_gauge_rr)}
        ${vcRow("Repeatability", vc.repeatability)}
        ${vcRow("Reproducibility", vc.reproducibility)}
        ${vcRow("Part-to-Part", vc.part_to_part)}
        ${vcRow("Total Variation", vc.total_variation)}
      </tbody>
    </table>
    <div class="cap-grid" style="margin-top:10px;">
      <div class="cap-stat highlight" style="border-color:${g.color}">
        <div class="cap-label">Number of Distinct Categories</div>
        <div class="cap-value" style="color:${g.color}">${r.ndc}</div>
        <div class="cap-grade" style="color:${g.color}">${g.label}</div>
      </div>
      <div class="cap-stat"><div class="cap-label">Parts &times; Operators &times; Trials</div><div class="cap-value" style="font-size:14px">${r.n_parts} &times; ${r.n_operators} &times; ${r.n_trials}</div></div>
    </div>`;
}

function ndcGrade(ndc: number): { label: string; color: string } {
  if (ndc < 2) return { label: "not usable", color: OOC_COLOR };
  if (ndc <= 4) return { label: "marginal", color: "#f2b705" };
  return { label: "acceptable", color: "#2ea043" };
}

export function renderEffectsTable(container: HTMLElement, r: FactorialEffectsResult) {
  const rows = r.effects.map((e) => {
    const g = sigGrade(e.p_value);
    return `<tr><td>${escapeHtml(e.term)}</td><td>${fmtN(e.effect)}</td><td>${fmtN(r.coefficients[e.term])}</td>` +
      `<td>${fmtN(e.ss)}</td><td>${fmtN(e.percent_contribution, 2)}%</td>` +
      `<td style="color:${g.color}">${e.p_value === null ? "—" : fmtN(e.p_value)}</td></tr>`;
  }).join("");
  const curvatureHtml = r.curvature ? (() => {
    const g = sigGrade(r.curvature!.p_value);
    return `
    <div class="cap-grid" style="margin-top:10px;">
      <div class="cap-stat"><div class="cap-label">Mean (Factorial Pts)</div><div class="cap-value">${fmtN(r.curvature!.mean_factorial, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">Mean (Center Pts)</div><div class="cap-value">${fmtN(r.curvature!.mean_center, 3)}</div></div>
      <div class="cap-stat"><div class="cap-label">Curvature</div><div class="cap-value">${fmtN(r.curvature!.difference, 3)}</div></div>
      <div class="cap-stat highlight" style="border-color:${g.color}">
        <div class="cap-label">Curvature P-Value</div><div class="cap-value" style="color:${g.color}">${r.curvature!.p_value === null ? "—" : fmtN(r.curvature!.p_value)}</div>
        <div class="cap-grade" style="color:${g.color}">${g.label}</div>
      </div>
    </div>`;
  })() : `<div class="helptext" style="margin-top:8px;">No center points in this design -- curvature can't be tested.</div>`;
  container.innerHTML = `
    <table class="stat-table">
      <thead><tr><th>Term</th><th>Effect</th><th>Coef</th><th>SS</th><th>%Contribution</th><th>P</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="cap-grid" style="margin-top:10px;">
      <div class="cap-stat"><div class="cap-label">Intercept</div><div class="cap-value">${fmtN(r.coefficients.intercept)}</div></div>
    </div>
    ${curvatureHtml}
    ${r.note ? `<div class="helptext" style="margin-top:8px;">${escapeHtml(r.note)}</div>` : ""}`;
}
