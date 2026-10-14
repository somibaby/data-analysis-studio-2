// formatters.ts — "what text does each analysis result print in the
// Session log" lives here (not in charts/, which is exclusively
// visual rendering), so every formatXxx() for a given analysis stays in
// one place next to the others.
import type {
  DescriptiveStatsResult, OneSampleTTestResult, TwoSampleTTestResult, PairedTTestResult,
  AnovaResult, RegressionResult, CorrelationResult, NormalityResult, BoxplotGroupedResult,
  GaugeRRResult, CapabilityResult, ParetoResult, FactorialEffectsResult,
} from "../types";

const f = (v: number | null | undefined, d = 4) => (v === null || v === undefined ? "*" : v.toFixed(d));

export function formatDescriptiveStats(col: string, r: DescriptiveStatsResult): string {
  return `Descriptive Statistics: ${col}\n\n` +
    `N        Mean     SE Mean  StDev    Min      Q1       Median   Q3       Max\n` +
    `${r.n}        ${f(r.mean)}  ${f(r.se_mean)}  ${f(r.stdev)}  ${f(r.min)}  ${f(r.q1)}  ${f(r.median)}  ${f(r.q3)}  ${f(r.max)}`;
}

export function formatOneSampleT(col: string, r: OneSampleTTestResult): string {
  return `One-Sample T: ${col}\n\n` +
    `N   Mean     StDev    SE Mean  ${(r.confidence * 100).toFixed(0)}% CI\n` +
    `${r.n}   ${f(r.mean)}  ${f(r.stdev)}  ${f(r.se_mean)}  (${f(r.ci_lower)}, ${f(r.ci_upper)})\n\n` +
    `Test of mu = ${f(r.hypothesized_mean, 3)} vs not = ${f(r.hypothesized_mean, 3)}\n` +
    `T-Value  DF  P-Value\n${f(r.t_value)}  ${f(r.df, 1)}  ${f(r.p_value)}`;
}

export function formatTwoSampleT(name1: string, name2: string, r: TwoSampleTTestResult): string {
  return `Two-Sample T-Test: ${name1} vs ${name2}\n\n` +
    `Sample    N   Mean     StDev    SE Mean\n` +
    `${name1.padEnd(9)} ${r.n1}   ${f(r.mean1)}  ${f(r.stdev1)}  ${f(r.se_mean1)}\n` +
    `${name2.padEnd(9)} ${r.n2}   ${f(r.mean2)}  ${f(r.stdev2)}  ${f(r.se_mean2)}\n\n` +
    `Difference = mu(${name1}) - mu(${name2})\n` +
    `Estimate for difference:  ${f(r.difference)}\n` +
    `${(r.confidence * 100).toFixed(0)}% CI for difference:  (${f(r.ci_lower)}, ${f(r.ci_upper)})\n` +
    `T-Test of difference = 0: T-Value = ${f(r.t_value)}  DF = ${f(r.df, 1)}  P-Value = ${f(r.p_value)}`;
}

export function formatPairedT(name1: string, name2: string, r: PairedTTestResult): string {
  return `Paired T-Test: ${name1}, ${name2}\n\n` +
    `N Pairs  Mean Diff  StDev Diff  SE Mean  ${(r.confidence * 100).toFixed(0)}% CI\n` +
    `${r.n_pairs}  ${f(r.mean_difference)}  ${f(r.stdev_difference)}  ${f(r.se_mean)}  (${f(r.ci_lower)}, ${f(r.ci_upper)})\n\n` +
    `T-Value  DF  P-Value\n${f(r.t_value)}  ${f(r.df, 1)}  ${f(r.p_value)}`;
}

export function formatAnova(col: string, factor: string, r: AnovaResult): string {
  const groupLines = r.groups.map((g) => `${g.name.padEnd(12)} ${String(g.n).padEnd(4)} ${f(g.mean)}  ${f(g.stdev)}`).join("\n");
  return `One-way ANOVA: ${col} versus ${factor}\n\n` +
    `Source  DF  SS        MS        F        P\n` +
    `Factor  ${r.factor_df}   ${f(r.factor_ss)}  ${f(r.factor_ms)}  ${f(r.f_value)}  ${f(r.p_value)}\n` +
    `Error   ${r.error_df}   ${f(r.error_ss)}  ${f(r.error_ms)}\n` +
    `Total   ${r.total_df}   ${f(r.total_ss)}\n\n` +
    `Level        N    Mean      StDev\n${groupLines}`;
}

export function formatRegression(xLabel: string, yLabel: string, r: RegressionResult): string {
  return `Regression Analysis: ${yLabel} versus ${xLabel}\n\n` +
    `The regression equation is\n${yLabel} = ${f(r.intercept, 3)} + ${f(r.slope, 3)} ${xLabel}\n\n` +
    `Predictor  Coef      SE Coef   T        P\n` +
    `Constant   ${f(r.intercept)}  ${f(r.se_intercept)}  ${f(r.t_intercept)}  ${f(r.p_intercept)}\n` +
    `${xLabel.padEnd(10)} ${f(r.slope)}  ${f(r.se_slope)}  ${f(r.t_slope)}  ${f(r.p_slope)}\n\n` +
    `S = ${f(r.se_regression)}   R-Sq = ${r.r_squared === null ? "*" : (r.r_squared * 100).toFixed(1) + "%"}   R-Sq(adj) = ${r.adj_r_squared === null ? "*" : (r.adj_r_squared * 100).toFixed(1) + "%"}\n\n` +
    `Analysis of Variance\nF = ${f(r.f_value)}   P = ${f(r.p_value_f)}`;
}

export function formatCorrelation(r: CorrelationResult): string {
  const lines = [`Correlations: ${r.columns.join(", ")}\n`];
  for (let i = 0; i < r.columns.length; i++) {
    for (let j = i + 1; j < r.columns.length; j++) {
      lines.push(`${r.columns[i]} / ${r.columns[j]}:  r = ${f(r.r[i][j], 3)}   P-Value = ${f(r.p_value[i][j])}`);
    }
  }
  lines.push(`\nN = ${r.n}`);
  return lines.join("\n");
}

export function formatNormality(col: string, r: NormalityResult): string {
  return `Normality Test: ${col}\n\n` +
    `N = ${r.n}   Mean = ${f(r.mean, 3)}   StDev = ${f(r.stdev, 3)}\n` +
    `Anderson-Darling Normality Test\nA-Squared = ${f(r.a_squared_adjusted, 3)}   P-Value = ${f(r.p_value)}`;
}

export function formatBoxplot(col: string, r: BoxplotGroupedResult): string {
  const lines = r.stats.map((s) => `${s.name.padEnd(12)} N=${s.n}  Min=${f(s.min, 3)}  Q1=${f(s.q1, 3)}  Median=${f(s.median, 3)}  Q3=${f(s.q3, 3)}  Max=${f(s.max, 3)}  Outliers=${s.outliers.length}`);
  return `Boxplot: ${col}\n\n${lines.join("\n")}`;
}

export function formatGaugeRR(measCol: string, r: GaugeRRResult): string {
  const vc = r.variance_components;
  return `Gauge R&R Study: ${measCol}\n\n` +
    `Parts=${r.n_parts}  Operators=${r.n_operators}  Trials=${r.n_trials}\n\n` +
    `Source              %Contribution  StdDev    Study Var  %Study Var\n` +
    `Total Gauge R&R     ${f(vc.total_gauge_rr.pct_contribution, 2)}%         ${f(vc.total_gauge_rr.stdev)}  ${f(vc.total_gauge_rr.study_var)}  ${f(vc.total_gauge_rr.pct_study_var, 2)}%\n` +
    `  Repeatability     ${f(vc.repeatability.pct_contribution, 2)}%         ${f(vc.repeatability.stdev)}  ${f(vc.repeatability.study_var)}  ${f(vc.repeatability.pct_study_var, 2)}%\n` +
    `  Reproducibility   ${f(vc.reproducibility.pct_contribution, 2)}%         ${f(vc.reproducibility.stdev)}  ${f(vc.reproducibility.study_var)}  ${f(vc.reproducibility.pct_study_var, 2)}%\n` +
    `Part-to-Part        ${f(vc.part_to_part.pct_contribution, 2)}%         ${f(vc.part_to_part.stdev)}  ${f(vc.part_to_part.study_var)}  ${f(vc.part_to_part.pct_study_var, 2)}%\n\n` +
    `Number of Distinct Categories = ${r.ndc}`;
}

export function formatCapability(col: string, r: CapabilityResult): string {
  const specLine = `LSL = ${r.lsl === null ? "*" : f(r.lsl, 3)}` +
    (r.target !== null ? `   Target = ${f(r.target, 3)}` : "") +
    `   USL = ${r.usl === null ? "*" : f(r.usl, 3)}`;
  return `Process Capability Analysis: ${col}\n\n` +
    `${specLine}\n` +
    `Mean = ${f(r.mean, 4)}   StDev(within) = ${f(r.sigma_within, 4)}   StDev(overall) = ${f(r.sigma_overall, 4)}\n` +
    `Cp = ${f(r.cp, 3)}   Cpk = ${f(r.cpk, 3)}   Pp = ${f(r.pp, 3)}   Ppk = ${f(r.ppk, 3)}\n` +
    `PPM < LSL = ${r.ppm_below_lsl === null ? "*" : Math.round(r.ppm_below_lsl)}   PPM > USL = ${r.ppm_above_usl === null ? "*" : Math.round(r.ppm_above_usl)}`;
}

export function formatFactorialEffects(responseCol: string, r: FactorialEffectsResult): string {
  const lines = r.effects.map((e) =>
    `${e.term.padEnd(12)} ${f(e.effect)}  ${f(e.ss)}  ${f(e.percent_contribution, 2)}%  ${e.p_value === null ? "*" : f(e.p_value)}`
  );
  const curv = r.curvature
    ? `\n\nCurvature: mean(factorial)=${f(r.curvature.mean_factorial, 3)}  mean(center)=${f(r.curvature.mean_center, 3)}  ` +
      `diff=${f(r.curvature.difference, 3)}  P=${r.curvature.p_value === null ? "*" : f(r.curvature.p_value)}`
    : "";
  const note = r.note ? `\n\n${r.note}` : "";
  return `Factorial Design -- Effects Analysis: ${responseCol}\n\n` +
    `Term         Effect    SS        %Contribution  P-Value\n${lines.join("\n")}${curv}${note}`;
}

export function formatPareto(col: string, r: ParetoResult): string {
  const lines = r.categories.map((c, i) => `${String(c).padEnd(14)} ${f(r.values[i], 1)}   ${f(r.cumulative_pct[i], 1)}%`);
  return `Pareto Chart: ${col}\n\nCategory        Count   Cumulative %\n${lines.join("\n")}`;
}
