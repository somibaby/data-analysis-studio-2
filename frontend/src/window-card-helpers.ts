// window-card-helpers.ts — every chart/analysis result opens in its own
// floating "graph window" (windows.ts), auto-numbered Graph1/Graph2/...
// the way Minitab does. addChartCard/addPanelCard are the two ways the
// chart-dispatch/* builders get a place to render into; windowSizeFor
// picks a fixed size per chart kind so each image fills its window with
// minimal letterboxing (sizes matched to the matplotlib figsize per
// chart -- see backend/plotting/*).
import { openGraphWindow } from "./windows";

export function windowSizeFor(kind: string): { width: number; height: number } {
  switch (kind) {
    case "pie": case "doughnut":
      return { width: 620, height: 480 };
    case "bar": case "line": case "radar": case "scatter": case "pareto": case "boxplot":
      return { width: 640, height: 420 };
    case "imr": case "xbar_r": case "xbar_s": case "control_chart":
      return { width: 800, height: 360 };
    case "regression": case "gauge_rr": case "histogram_capability": case "probability_plot":
      return { width: 780, height: 460 };
    case "doe_effects":
      return { width: 920, height: 600 };
    case "sixpack":
      return { width: 940, height: 650 };
    case "correlation":
      return { width: 600, height: 420 };
    case "anova": case "two_sample_t": case "paired_t": case "descriptive_stats": case "one_sample_t":
      return { width: 520, height: 400 };
    default:
      return { width: 480, height: 380 };
  }
}

export function addChartCard(title: string, kind: string): HTMLElement {
  let container!: HTMLElement;
  openGraphWindow(title, (body) => {
    container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    body.appendChild(container);
  }, windowSizeFor(kind));
  return container;
}

export function addPanelCard(title: string, kind: string): HTMLElement {
  let body!: HTMLElement;
  openGraphWindow(title, (b) => { body = b; }, windowSizeFor(kind));
  return body;
}
