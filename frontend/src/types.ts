// types.ts — shared TypeScript interfaces mirroring the Pydantic models
// across backend/routers/*.py (split out of a single app.py in the Oct
// 2026 restructuring; the request/response shapes themselves didn't
// change). Keeping these in sync by hand is one of the small costs of a
// polyglot stack; it's a natural place to later generate types
// automatically from the FastAPI OpenAPI schema if this grows.
//
// Left as one file rather than split like stats/, plotting/, routers/,
// etc. -- it's already clustered below by topic (lowest payoff/risk
// item in the whole restructuring, since a split would just mean typing
// the same small interfaces with extra import lines in between):
//   - dataset/grid basics: DatasetSummary, RowsPage, CellUpdate, SelRange
//   - SPC/capability: ControlChartSeries, Xbar*/Imr results, CapabilityResult,
//     HistogramResult, ParetoResult, NormalityResult, NormalProbabilityPlot,
//     SixpackResult, CompareResult
//   - statistical inference: DescriptiveStatsResult, *TTestResult, AnovaResult,
//     RegressionResult, CorrelationResult, Boxplot*, GaugeRR*
//   - DOE: Factorial*

export interface DatasetSummary {
  id: number;
  name: string;
  headers: string[];
  row_count: number;
}

export interface RowsPage {
  rows: (string | number | null)[][];
  total: number;
  offset: number;
  limit: number;
  headers: string[];
}

export interface CellUpdate {
  row_index: number;
  col_index: number;
  value: string;
}

export interface SelRange {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export interface ControlChartSeries {
  values: number[];
  center: number;
  ucl: number;
  lcl: number;
  out_of_control: number[];
}

export interface XbarRResult {
  type: "xbar_r";
  subgroup_size: number;
  n_subgroups: number;
  xbar: ControlChartSeries;
  r: ControlChartSeries;
  sigma_within: number;
}

export interface XbarSResult {
  type: "xbar_s";
  subgroup_size: number;
  n_subgroups: number;
  xbar: ControlChartSeries;
  s: ControlChartSeries;
  sigma_within: number;
}

export interface ImrResult {
  type: "imr";
  i: ControlChartSeries;
  mr: ControlChartSeries;
  sigma_within: number;
}

export type ControlChartResult = XbarRResult | XbarSResult | ImrResult;

export interface CapabilityResult {
  mean: number;
  sigma_overall: number;
  sigma_within: number;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  lsl: number | null;
  usl: number | null;
  target: number | null;
  ppm_below_lsl: number | null;
  ppm_above_usl: number | null;
}

export interface HistogramResult {
  counts: number[];
  bin_edges: number[];
  mean: number;
  std: number;
  lsl: number | null;
  usl: number | null;
  target: number | null;
}

export interface ParetoResult {
  categories: string[];
  values: number[];
  cumulative_pct: number[];
}

export interface NormalityResult {
  n: number;
  mean: number;
  stdev: number;
  a_squared: number;
  a_squared_adjusted: number;
  p_value: number;
}

export interface NormalProbabilityPlot {
  sorted_values: number[];
  theoretical_quantiles: number[];
  fitted_line: number[];
  mean: number;
  std: number;
  ad_test?: NormalityResult;
}

export interface SixpackResult {
  chart: ControlChartResult;
  capability: CapabilityResult;
  histogram: HistogramResult;
  normal_probability_plot: NormalProbabilityPlot;
  last_subgroups: number[];
}

export interface CompareResult {
  categories: string[];
  series_names: string[];
  matrix: (number | null)[][];
}

// ---------------------------------------------------------------------
// Statistical inference
// ---------------------------------------------------------------------

export interface DescriptiveStatsResult {
  n: number; mean: number; stdev: number; se_mean: number;
  min: number; q1: number; median: number; q3: number; max: number;
}

export interface OneSampleTTestResult {
  n: number; mean: number; stdev: number; se_mean: number; hypothesized_mean: number;
  t_value: number | null; df: number; p_value: number;
  ci_lower: number; ci_upper: number; confidence: number;
}

export interface TwoSampleTTestResult {
  n1: number; mean1: number; stdev1: number; se_mean1: number;
  n2: number; mean2: number; stdev2: number; se_mean2: number;
  difference: number; se_difference: number; df: number; t_value: number | null; p_value: number;
  ci_lower: number; ci_upper: number; confidence: number;
}

export interface PairedTTestResult {
  n_pairs: number; mean_difference: number; stdev_difference: number; se_mean: number;
  t_value: number | null; df: number; p_value: number;
  ci_lower: number; ci_upper: number; confidence: number;
}

export interface AnovaGroupStat { name: string; n: number; mean: number; stdev: number; }
export interface AnovaResult {
  groups: AnovaGroupStat[];
  factor_df: number; factor_ss: number; factor_ms: number;
  error_df: number; error_ss: number; error_ms: number;
  total_df: number; total_ss: number;
  f_value: number | null; p_value: number | null; r_squared: number | null;
}

export interface RegressionResult {
  n: number; slope: number; intercept: number;
  se_slope: number; se_intercept: number;
  t_slope: number | null; p_slope: number | null; t_intercept: number | null; p_intercept: number | null;
  r_squared: number | null; adj_r_squared: number | null;
  f_value: number | null; p_value_f: number | null; df_resid: number; se_regression: number;
  x_values: number[]; y_values: number[]; fitted_values: number[]; residuals: number[];
}

export interface CorrelationResult { columns: string[]; r: number[][]; p_value: number[][]; n: number; }

export interface BoxplotStats {
  name: string; n: number; min: number; q1: number; median: number; q3: number; max: number;
  iqr: number; whisker_low: number; whisker_high: number; outliers: number[];
}
export interface BoxplotGroupedResult { categories: string[]; stats: BoxplotStats[]; }

export interface GaugeRRSourceRow { df: number; ss: number; ms: number; f: number | null; p: number | null; }
export interface GaugeRRVarComponent {
  var: number; stdev: number; study_var: number; pct_contribution: number; pct_study_var: number;
}
export interface GaugeRRResult {
  anova: {
    part: GaugeRRSourceRow; operator: GaugeRRSourceRow; interaction: GaugeRRSourceRow;
    error: { df: number; ss: number; ms: number }; total: { df: number; ss: number };
  };
  variance_components: {
    repeatability: GaugeRRVarComponent; operator: GaugeRRVarComponent; operator_by_part: GaugeRRVarComponent;
    reproducibility: GaugeRRVarComponent; part_to_part: GaugeRRVarComponent;
    total_gauge_rr: GaugeRRVarComponent; total_variation: GaugeRRVarComponent;
  };
  ndc: number; n_parts: number; n_operators: number; n_trials: number;
}

// ---------------------------------------------------------------------
// Design of Experiments (DOE) -- two-level full factorials
// ---------------------------------------------------------------------

export interface FactorialRun {
  std_order: number;
  run_order: number;
  [factorName: string]: number;
}
export interface FactorialDesignResult {
  factor_names: string[];
  runs: FactorialRun[];
}

export interface FactorialEffect {
  term: string;
  effect: number;
  ss: number;
  percent_contribution: number;
  p_value: number | null;
}
export interface FactorialNormalEffect {
  term: string;
  effect: number;
  z_score: number;
}
export interface FactorialCurvature {
  mean_factorial: number;
  mean_center: number;
  difference: number;
  p_value: number | null;
}
export interface FactorialEffectsResult {
  effects: FactorialEffect[];
  normal_effects: FactorialNormalEffect[];
  coefficients: Record<string, number>;
  curvature: FactorialCurvature | null;
  note?: string;
}
