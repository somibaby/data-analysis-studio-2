// grid-toolbar.ts — the Grid tab's toolbar: add row/col, sort column,
// CSV import/export, and the "Create Factorial Design" button. Takes
// switchDataset (from boot.ts) and gotoGridTab (from sidebar.ts) as
// parameters to pass through to doe-form.ts; see boot.ts's header
// comment on why these aren't direct imports.
import { api } from "./api";
import { download, num, toCSV, parseDelimited } from "./util";
import { datasets, grid, activeDataset } from "./state";
import { openDoeDesignForm } from "./doe-form";

export function wireStaticControls(switchDataset: (id: number) => Promise<void>, gotoGridTab: () => void) {
  document.getElementById("btnAddRow")!.addEventListener("click", () => {
    (document.querySelector(".gaddrow") as HTMLElement | null)?.click();
  });
  document.getElementById("btnAddCol")!.addEventListener("click", () => {
    (document.querySelector(".gaddcol") as HTMLElement | null)?.click();
  });
  document.getElementById("btnSortColumn")!.addEventListener("click", () => {
    sortActiveDatasetByColumn(switchDataset, grid.selection?.c0 ?? 0, "asc");
  });
  document.getElementById("btnExportCsv")!.addEventListener("click", async () => {
    const ds = activeDataset();
    if (!ds) return;
    const rows = await grid.getAllRows();
    download(ds.name.replace(/[^a-z0-9_\-]+/gi, "_") + ".csv", toCSV(ds.headers, rows), "text/csv");
  });
  document.getElementById("btnImportCsv")!.addEventListener("click", () => {
    (document.getElementById("fileInput") as HTMLInputElement).click();
  });
  document.getElementById("fileInput")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const matrix = parseDelimited(text);
    const headers = matrix[0] || [""];
    const rows = matrix.slice(1);
    const name = file.name.replace(/\.(csv|tsv|txt)$/i, "") || `Group ${datasets.length + 1}`;
    const ds = await api.createDataset(name, headers, rows);
    datasets.push(ds);
    await switchDataset(ds.id);
    (e.target as HTMLInputElement).value = "";
  });
  document.getElementById("btnCreateDoeDesign")!.addEventListener("click", () => openDoeDesignForm(switchDataset, gotoGridTab));
}

/** Data > Sort Selected Column. Deliberately minimal (ascending only, on
 * whichever column is currently selected in the grid) -- this is the one
 * genuinely new data-mutation feature in the Minitab-menu pass, kept
 * small on purpose. */
async function sortActiveDatasetByColumn(switchDataset: (id: number) => Promise<void>, colIndex: number, dir: "asc" | "desc") {
  const ds = activeDataset();
  if (!ds) return;
  const rows = await grid.getAllRows();
  const idx = rows.map((_, i) => i);
  idx.sort((a, b) => {
    const av = num(rows[a][colIndex]), bv = num(rows[b][colIndex]);
    const cmp = av !== null && bv !== null
      ? av - bv
      : String(rows[a][colIndex] ?? "").localeCompare(String(rows[b][colIndex] ?? ""));
    return dir === "asc" ? cmp : -cmp;
  });
  const updates = idx.flatMap((srcRow, destRow) =>
    rows[srcRow].map((value, c) => ({ row_index: destRow, col_index: c, value }))
  );
  await api.updateCells(ds.id, updates);
  await switchDataset(ds.id);
}
