// state.ts — the 4 pieces of state multiple split-out modules (boot.ts,
// sidebar.ts, grid-toolbar.ts, chart-builder-form.ts, chart-dispatch/*)
// need to read. Only this file reassigns them; everyone else reads the
// exported `let`s directly (fine for .push()-style mutation) or calls a
// setter below when the whole binding needs to be replaced.
import type { DatasetSummary } from "./types";
import type { Grid } from "./grid";

export let datasets: DatasetSummary[] = [];
export let activeDatasetId: number | null = null;
export let grid: Grid;
export let builderMode: "single" | "multi" = "single";

export function activeDataset(): DatasetSummary | undefined {
  return datasets.find((d) => d.id === activeDatasetId);
}

export function setDatasets(d: DatasetSummary[]) { datasets = d; }
export function setActiveDatasetId(id: number | null) { activeDatasetId = id; }
export function setGrid(g: Grid) { grid = g; }
export function setBuilderMode(m: "single" | "multi") { builderMode = m; }
