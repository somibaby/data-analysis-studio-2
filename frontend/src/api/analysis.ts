// analysis.ts — SPC/capability, statistical-inference, DOE, compare, and
// health methods, mirroring backend/routers/{spc_capability,inference,
// doe,misc}.py one for one. Spread into the combined `api` object in
// index.ts.
import type {
  ControlChartResult, CapabilityResult, HistogramResult,
  ParetoResult, SixpackResult, CompareResult, NormalProbabilityPlot,
  DescriptiveStatsResult, OneSampleTTestResult, TwoSampleTTestResult, PairedTTestResult,
  AnovaResult, RegressionResult, CorrelationResult, NormalityResult,
  BoxplotGroupedResult, GaugeRRResult, FactorialDesignResult, FactorialEffectsResult,
} from "../types";
import { req } from "./client";

export const analysisApi = {
  controlChart: (values: number[], chart_type: string, subgroup_size = 1) =>
    req<ControlChartResult>("/api/analysis/control-chart", {
      method: "POST",
      body: JSON.stringify({ values, chart_type, subgroup_size }),
    }),

  capability: (values: number[], lsl: number | null, usl: number | null, sigma_within: number | null, target: number | null = null) =>
    req<CapabilityResult>("/api/analysis/capability", {
      method: "POST",
      body: JSON.stringify({ values, lsl, usl, sigma_within, target }),
    }),

  histogram: (values: number[], bins = 12, lsl: number | null = null, usl: number | null = null, target: number | null = null) =>
    req<HistogramResult>("/api/analysis/histogram", {
      method: "POST",
      body: JSON.stringify({ values, bins, lsl, usl, target }),
    }),

  pareto: (categories: string[], values: number[]) =>
    req<ParetoResult>("/api/analysis/pareto", {
      method: "POST",
      body: JSON.stringify({ categories, values }),
    }),

  sixpack: (values: number[], subgroup_size: number, lsl: number | null, usl: number | null, target: number | null = null) =>
    req<SixpackResult>("/api/analysis/sixpack", {
      method: "POST",
      body: JSON.stringify({ values, subgroup_size, lsl, usl, target }),
    }),

  compare: (dataset_ids: number[], x_column: string, y_column: string, method = "avg") =>
    req<CompareResult>("/api/analysis/compare", {
      method: "POST",
      body: JSON.stringify({ dataset_ids, x_column, y_column, method }),
    }),

  normalProbabilityPlot: (values: number[]) =>
    req<NormalProbabilityPlot>("/api/analysis/normal-probability-plot", {
      method: "POST", body: JSON.stringify({ values }),
    }),

  descriptiveStats: (values: number[]) =>
    req<DescriptiveStatsResult>("/api/analysis/descriptive-stats", {
      method: "POST", body: JSON.stringify({ values }),
    }),

  oneSampleTtest: (values: number[], hypothesized_mean = 0) =>
    req<OneSampleTTestResult>("/api/analysis/one-sample-ttest", {
      method: "POST", body: JSON.stringify({ values, hypothesized_mean }),
    }),

  twoSampleTtest: (sample1: number[], sample2: number[]) =>
    req<TwoSampleTTestResult>("/api/analysis/two-sample-ttest", {
      method: "POST", body: JSON.stringify({ sample1, sample2 }),
    }),

  pairedTtest: (sample1: number[], sample2: number[]) =>
    req<PairedTTestResult>("/api/analysis/paired-ttest", {
      method: "POST", body: JSON.stringify({ sample1, sample2 }),
    }),

  anova: (groups: Record<string, number[]>) =>
    req<AnovaResult>("/api/analysis/anova", {
      method: "POST", body: JSON.stringify({ groups }),
    }),

  regression: (x: number[], y: number[]) =>
    req<RegressionResult>("/api/analysis/regression", {
      method: "POST", body: JSON.stringify({ x, y }),
    }),

  correlation: (columns: Record<string, number[]>) =>
    req<CorrelationResult>("/api/analysis/correlation", {
      method: "POST", body: JSON.stringify({ columns }),
    }),

  normality: (values: number[]) =>
    req<NormalityResult>("/api/analysis/normality", {
      method: "POST", body: JSON.stringify({ values }),
    }),

  boxplot: (values: number[], groups: string[] | null = null) =>
    req<BoxplotGroupedResult>("/api/analysis/boxplot", {
      method: "POST", body: JSON.stringify({ values, groups }),
    }),

  gaugeRR: (parts: string[], operators: string[], measurements: number[]) =>
    req<GaugeRRResult>("/api/analysis/gauge-rr", {
      method: "POST", body: JSON.stringify({ parts, operators, measurements }),
    }),

  doeDesign: (factor_names: string[], center_points = 0, replicates = 1) =>
    req<FactorialDesignResult>("/api/analysis/doe-design", {
      method: "POST", body: JSON.stringify({ factor_names, center_points, replicates }),
    }),

  doeEffects: (factor_names: string[], design: number[][], responses: number[]) =>
    req<FactorialEffectsResult>("/api/analysis/doe-effects", {
      method: "POST", body: JSON.stringify({ factor_names, design, responses }),
    }),

  health: () => req<{ ok: boolean }>("/api/health"),
};
