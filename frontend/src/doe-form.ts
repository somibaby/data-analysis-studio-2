// doe-form.ts — "Create Factorial Design" affordance: a small form (in a
// floating graph window, same mechanism every analysis result already
// uses) that calls /api/analysis/doe-design and drops the generated
// coded-level columns plus an empty Response column straight into a new
// worksheet -- no dedicated results view, just gets the design into the
// grid so the user can fill in real experimental results and then run
// "Factorial Effects Analysis (DOE)" on it. Takes switchDataset (from
// boot.ts) and gotoGridTab (from sidebar.ts) as parameters since this
// file is a leaf consumer of both.
import { api } from "./api";
import { openGraphWindow } from "./windows";
import { datasets } from "./state";

export function openDoeDesignForm(switchDataset: (id: number) => Promise<void>, gotoGridTab: () => void) {
  openGraphWindow("New Factorial Design", (body) => {
    body.innerHTML = `
      <div class="field">
        <label>Factor names (comma-separated, 2–7)</label>
        <input type="text" id="doeFactorNames" placeholder="e.g. Temperature, Pressure, Time" style="width:100%;">
      </div>
      <div class="field">
        <label>Center points</label>
        <input type="number" id="doeCenterPoints" min="0" value="0" style="width:100%;">
      </div>
      <div class="field">
        <label>Replicates</label>
        <input type="number" id="doeReplicates" min="1" value="1" style="width:100%;">
      </div>
      <button class="btn primary" id="doeGenerateBtn" style="width:100%;justify-content:center;">Generate design into new worksheet</button>
      <div class="helptext" id="doeFormError" style="color:#e0524b;margin-top:8px;"></div>
    `;
    body.querySelector("#doeGenerateBtn")!.addEventListener("click", async () => {
      const errEl = body.querySelector("#doeFormError") as HTMLElement;
      errEl.textContent = "";
      try {
        const namesRaw = (body.querySelector("#doeFactorNames") as HTMLInputElement).value;
        const factorNames = namesRaw.split(",").map((s) => s.trim()).filter(Boolean);
        const centerPoints = parseInt((body.querySelector("#doeCenterPoints") as HTMLInputElement).value || "0", 10);
        const replicates = parseInt((body.querySelector("#doeReplicates") as HTMLInputElement).value || "1", 10);
        const design = await api.doeDesign(factorNames, centerPoints, replicates);
        const headers = [...design.factor_names, "Response"];
        const rows: (string | number)[][] = design.runs.map((r) => [...design.factor_names.map((f) => r[f]), ""]);
        const ds = await api.createDataset(`Factorial Design ${datasets.length + 1}`, headers, rows);
        datasets.push(ds);
        await switchDataset(ds.id);
        gotoGridTab();
      } catch (err: any) {
        errEl.textContent = "Could not generate design: " + (err?.message ?? err);
      }
    });
  }, { width: 420, height: 330 });
}
