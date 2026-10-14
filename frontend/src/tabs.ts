// tabs.ts — wires the three top-level tab buttons (Grid / Charts / Session)
// and the "Clear"/"Go to Session" buttons next to the session log. The
// Charts tab needs to refresh the chart-builder form on every switch;
// main.ts supplies that as a callback so this file doesn't need to import
// back from whichever module ends up owning renderChartBuilder().
import { clearSession } from "./session";

const TAB_NAMES = ["grid", "charts", "session"];

export function wireTabs(onSwitchToCharts: () => void) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = (btn as HTMLElement).dataset.tab;
      TAB_NAMES.forEach((t) => document.getElementById(`view-${t}`)!.classList.toggle("hidden", t !== tab));
      if (tab === "charts") onSwitchToCharts();
    });
  });
  document.getElementById("btnClearSession")!.addEventListener("click", () => clearSession());
  document.getElementById("btnGotoSession")!.addEventListener("click", () => {
    (document.querySelector('.tab-btn[data-tab="session"]') as HTMLElement).click();
  });
}
