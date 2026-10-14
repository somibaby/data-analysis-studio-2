// dispatch-doe.ts — chart builder for the "Design of Experiments"
// optgroup in index.html's chart-type select: Factorial Effects Analysis.
// Called by dispatchSpcChart() in dispatch-core.ts.
import { api } from "../api";
import { renderEffectsParetoChart, renderEffectsTable, renderNormalProbabilityPlot } from "../charts";
import { grid, activeDataset } from "../state";
import { num } from "../util";
import { logToSession, formatFactorialEffects } from "../session";
import { addPanelCard } from "../window-card-helpers";
import { colName } from "./dispatch-core";

export async function buildDoeEffectsChart(title: string) {
  const ds = activeDataset()!;
  const factorIdxs = [...document.querySelectorAll<HTMLInputElement>("#checkY input:checked")].map((i) => parseInt(i.value, 10));
  if (factorIdxs.length < 2 || factorIdxs.length > 7) throw new Error("Check 2 to 7 factor columns for a factorial effects analysis.");
  const respIdx = parseInt((document.getElementById("selYSingle") as HTMLSelectElement).value, 10);
  const factorNames = factorIdxs.map((i) => colName(ds, i));
  const rows = await grid.getAllRows();
  const design: number[][] = [];
  const responses: number[] = [];
  rows.forEach((r) => {
    const resp = num(r[respIdx]);
    if (resp === null) return;
    const levels = factorIdxs.map((i) => num(r[i]));
    if (levels.some((v) => v === null)) return;
    design.push(levels as number[]);
    responses.push(resp);
  });
  const result = await api.doeEffects(factorNames, design, responses);
  const card = addPanelCard(title, "doe_effects");
  card.innerHTML = `<div class="hist-cap-layout"><div class="hist-cap-chart"><div id="doeParetoImg" style="height:220px;"></div><div id="doeNormalImg" style="height:220px;margin-top:16px;"></div></div><div class="hist-cap-card"></div></div>`;
  await renderEffectsParetoChart(card.querySelector("#doeParetoImg") as HTMLElement, factorNames, design, responses);
  await renderNormalProbabilityPlot(card.querySelector("#doeNormalImg") as HTMLElement, result.normal_effects.map((e) => e.effect));
  renderEffectsTable(card.querySelector(".hist-cap-card") as HTMLElement, result);
  logToSession(title, formatFactorialEffects(colName(ds, respIdx), result));
}
