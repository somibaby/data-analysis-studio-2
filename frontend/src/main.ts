// main.ts — the composition root. Every feature lives in its own module
// (boot, sidebar, tabs, grid-toolbar, doe-form, chart-builder-form,
// chart-dispatch/*, charts, session, util, windows, grid, wasmStats, api,
// state); this file just wires their top-level DOM event listeners in
// the same order the old monolithic main.ts did, then starts the app.
import { escapeHtml } from "./util";
import { boot, switchDataset } from "./boot";
import { wireSidebar } from "./sidebar";
import { wireTabs } from "./tabs";
import { wireChartBuilderForm, renderChartBuilder } from "./chart-builder-form";
import { wireGenerateButton } from "./chart-dispatch/dispatch-core";

// wireStaticControls() (grid-toolbar.ts) is called from inside boot(),
// same as the original -- it's the one piece of top-level wiring that
// isn't set up immediately, matching the original module's exact order.
wireSidebar(switchDataset);
wireTabs(() => renderChartBuilder());
wireChartBuilderForm(switchDataset);
wireGenerateButton();

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:#900">
    <h2>Couldn't start the app</h2>
    <p>${escapeHtml(String(err?.message ?? err))}</p>
    <p style="color:#555">Is the backend running? Check the terminal window start.sh opened, and make sure PostgreSQL is running.</p>
  </div>`;
});
