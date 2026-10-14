// sidebar.ts — the Worksheets list (rename/delete/switch active sheet,
// add new sheet) and the Project Manager's Graphs list. renderSidebar()
// and wireSidebar() take switchDataset/renderChartBuilder as parameters
// rather than importing them directly from boot.ts/chart-builder-form.ts
// -- boot.ts already imports this file (to call renderSidebar), so a
// direct import back would be circular at the type level in a way that's
// harder to follow; passing them in keeps the dependency direction
// explicit even though, as described in boot.ts's header, the actual
// runtime calls are perfectly safe either way.
import { api } from "./api";
import { escapeHtml } from "./util";
import { listWindows, bringToFront } from "./windows";
import { datasets, activeDatasetId, setDatasets } from "./state";

type SwitchDataset = (id: number) => Promise<void>;
type RenderChartBuilder = () => void;

export function renderSidebar(switchDataset: SwitchDataset, renderChartBuilder: RenderChartBuilder) {
  const list = document.getElementById("sheetList")!;
  list.innerHTML = "";
  datasets.forEach((ds) => {
    const div = document.createElement("div");
    div.className = "sheet-item" + (ds.id === activeDatasetId ? " active" : "");
    div.innerHTML = `<span class="grip">▤</span><input type="text" value="${escapeHtml(ds.name)}"><span class="del-sheet" title="Delete">✕</span>`;
    const input = div.querySelector("input") as HTMLInputElement;
    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("change", async () => {
      await api.renameDataset(ds.id, input.value || ds.name);
      ds.name = input.value || ds.name;
      if (ds.id === activeDatasetId) document.getElementById("sheetNameLabel")!.textContent = ds.name;
      renderChartBuilder();
    });
    div.addEventListener("click", () => switchDataset(ds.id));
    div.querySelector(".del-sheet")!.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (datasets.length <= 1) { alert("At least one dataset is required."); return; }
      if (!confirm(`Delete group "${ds.name}"?`)) return;
      await api.deleteDataset(ds.id);
      setDatasets(datasets.filter((d) => d.id !== ds.id));
      if (activeDatasetId === ds.id) await switchDataset(datasets[0].id);
      renderSidebar(switchDataset, renderChartBuilder);
    });
    list.appendChild(div);
  });
}

export function wireSidebar(switchDataset: SwitchDataset) {
  document.getElementById("btnAddSheet")!.addEventListener("click", async () => {
    const n = datasets.length + 1;
    const ds = await api.createDataset(`Group ${n}`, ["Column A", "Column B", "Column C"], [["", "", ""], ["", "", ""], ["", "", ""]]);
    datasets.push(ds);
    await switchDataset(ds.id);
  });
}

// -------------------------------------------------------------- Project Manager: Graphs list
export function renderGraphList() {
  const list = document.getElementById("graphList")!;
  const wins = listWindows();
  list.innerHTML = wins.length
    ? wins.map((w) => `<div class="sheet-item" data-winid="${w.id}"><span class="grip">▦</span><span>${escapeHtml(w.title)}</span></div>`).join("")
    : `<div class="hint">No graphs open.</div>`;
  list.querySelectorAll<HTMLElement>("[data-winid]").forEach((el) => {
    el.addEventListener("click", () => {
      const w = wins.find((x) => x.id === el.dataset.winid);
      if (w) bringToFront(w);
    });
  });
}

export function gotoGridTab() {
  (document.querySelector('.tab-btn[data-tab="grid"]') as HTMLElement).click();
}
