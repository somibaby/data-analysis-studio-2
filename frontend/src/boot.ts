// boot.ts — app startup (boot/seedSampleData) and switchDataset(), the
// one function that loads a dataset into the grid and refreshes every
// view that depends on "which dataset is active" (sidebar, chart
// builder). boot.ts and sidebar.ts/chart-builder-form.ts call each other
// (switchDataset() refreshes the sidebar and chart builder; the sidebar's
// own click/rename/delete handlers call switchDataset() back) -- every
// one of those calls happens inside an event-handler body, never at
// module-evaluation time, so the mutual import between these files
// resolves safely under esbuild/ESM.
import { api } from "./api";
import { Grid } from "./grid";
import { initWasm, wasmAvailable } from "./wasmStats";
import { initWindowWorkspace } from "./windows";
import {
  datasets, grid, setDatasets, setActiveDatasetId, setGrid,
} from "./state";
import { renderSidebar, renderGraphList, gotoGridTab } from "./sidebar";
import { renderChartBuilder } from "./chart-builder-form";
import { wireStaticControls } from "./grid-toolbar";

export async function boot() {
  const gridContainer = document.getElementById("gridContainer") as HTMLElement;
  setGrid(new Grid(gridContainer));
  grid.onSchemaChanged = () => { renderChartBuilder(); renderSidebar(switchDataset, renderChartBuilder); };

  initWasm().then(() => {
    const badge = document.getElementById("wasmBadge")!;
    badge.textContent = wasmAvailable ? "⚡ Rust/WASM live" : "⚡ JS fallback (wasm not built)";
    badge.className = "wasm-badge " + (wasmAvailable ? "on" : "off");
  });

  setDatasets(await api.listDatasets());
  if (datasets.length === 0) {
    await seedSampleData();
    setDatasets(await api.listDatasets());
  }
  setActiveDatasetId(datasets[0].id);
  initWindowWorkspace(document.getElementById("graphWorkspace")!, () => {
    renderGraphList();
  });
  renderSidebar(switchDataset, renderChartBuilder);
  await switchDataset(datasets[0].id);
  renderChartBuilder();
  wireStaticControls(switchDataset, gotoGridTab);
}

async function seedSampleData() {
  // deterministic pseudo-random generator so the demo data is reproducible
  function mulberry32(seed: number) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rand: () => number, mean: number, sd: number) {
    const u1 = Math.max(rand(), 1e-9), u2 = rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  function buildLine(name: string, seed: number, mean: number, sd: number) {
    const rand = mulberry32(seed);
    const shifts = ["Morning", "Afternoon", "Night"];
    const defects = ["Scratch", "Dent", "Paint", "Crack", "Misalign"];
    const rows: (string | number)[][] = [];
    for (let i = 0; i < 60; i++) {
      const diameter = Math.round(gauss(rand, mean, sd) * 1000) / 1000;
      const weight = Math.round(gauss(rand, mean * 25, sd * 20) * 10) / 10;
      const shift = shifts[i % shifts.length];
      const defect = defects[Math.floor(rand() * defects.length)];
      const defectCount = Math.floor(rand() * 6);
      rows.push([i + 1, shift, diameter, weight, defect, defectCount]);
    }
    return { name, headers: ["Sample", "Shift", "Diameter_mm", "Weight_g", "DefectType", "DefectCount"], rows };
  }
  const a = buildLine("Line A", 42, 25.0, 0.35);
  const b = buildLine("Line B", 99, 25.4, 0.55);
  await api.createDataset(a.name, a.headers, a.rows);
  await api.createDataset(b.name, b.headers, b.rows);
}

export async function switchDataset(id: number) {
  setActiveDatasetId(id);
  const ds = datasets.find((d) => d.id === id);
  if (!ds) return;
  await grid.loadDataset(ds);
  document.getElementById("sheetNameLabel")!.textContent = ds.name;
  renderSidebar(switchDataset, renderChartBuilder);
  renderChartBuilder();
}
