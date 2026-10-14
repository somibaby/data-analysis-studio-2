// charts/index.ts — barrel. Re-exports everything from image-charts.ts
// (server-rendered PNG charts) and stat-cards.ts (plain-HTML result
// panels) so every existing `from "./charts"` / `from "../charts"` import
// elsewhere in the app keeps resolving unchanged. render-server-chart.ts
// is intentionally NOT re-exported here -- it's an internal helper only
// image-charts.ts needs. New chart or stat-card functions get added to
// one of those two files and re-exported here.
export * from "./image-charts";
export * from "./stat-cards";
