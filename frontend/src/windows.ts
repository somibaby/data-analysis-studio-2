// windows.ts — "graph window" manager: closable tiles laid out in a
// normal flowing grid inside the workspace container (flex-wrap, see
// .graph-workspace in styles.css). Each tile's title is just whatever
// the caller passes in (e.g. "Bar Chart — diameter_mm") -- no "(GraphN)"
// suffix; nextWindowNum still increments to keep each tile's internal id
// unique for closing/scrolling-to, it's just not shown. Each tile's size
// is fixed
// per chart type (chosen by the caller to match that chart's image
// aspect ratio) rather than user-resizable, since a resized window
// stretches/letterboxes a matplotlib image that was rendered at a fixed
// aspect ratio. Tiles are no longer free-floating/draggable -- a new
// chart is simply appended after the existing ones and the flex layout
// wraps it onto the current row if it fits, or starts a new row below,
// so nothing needs manual arranging or scrolls around to be found.
//
// Fitting *one* oversized tile to the workspace (max-width/max-height in
// CSS) isn't enough on its own: several tiles that each individually fit
// can still add up to more total height than the workspace has, which
// still forces a scrollbar. refitTiles() below re-scales every open tile
// together (all by the same factor, so none of them get visually
// distorted relative to each other) until the whole set actually fits,
// re-running after every open/close and on window resize.
import { escapeHtml } from "./util";

export interface GraphWindow { id: string; title: string; el: HTMLElement; baseWidth: number; }

const MIN_SCALE = 0.35;

let workspaceEl: HTMLElement;
let windows: GraphWindow[] = [];
let nextWindowNum = 1;
let onChange: (() => void) | null = null;

export function initWindowWorkspace(container: HTMLElement, onListChanged: () => void) {
  workspaceEl = container;
  onChange = onListChanged;
  window.addEventListener("resize", debouncedRefit);
}

export function openGraphWindow(
  titlePrefix: string,
  buildContent: (body: HTMLElement) => void,
  size: { width: number; height: number } = { width: 480, height: 380 },
): GraphWindow {
  document.getElementById("workspaceEmpty")?.classList.add("hidden");
  const id = "win_" + nextWindowNum;
  nextWindowNum++;
  const title = titlePrefix;
  const el = document.createElement("div");
  el.className = "graph-win";
  // aspectRatio (not a fixed height) so a tile that gets scaled down --
  // whether by refitTiles() below or by the CSS max-width/max-height
  // floor -- keeps its correct proportions; only its width is ever set
  // directly, in px, and height always follows from the ratio.
  el.style.aspectRatio = `${size.width} / ${size.height}`;
  el.innerHTML =
    `<div class="graph-win-titlebar"><span class="graph-win-title">${escapeHtml(title)}</span>` +
    `<span class="graph-win-btn graph-win-close" title="Close">&times;</span></div>` +
    `<div class="graph-win-body"></div>`;
  workspaceEl.appendChild(el);
  const win: GraphWindow = { id, title, el, baseWidth: size.width };
  windows.push(win);
  el.querySelector(".graph-win-close")!.addEventListener("click", (e) => {
    e.stopPropagation();
    closeGraphWindow(id);
  });
  buildContent(el.querySelector(".graph-win-body") as HTMLElement);
  refitTiles();
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  onChange?.();
  return win;
}

export function closeGraphWindow(id: string) {
  const win = windows.find((w) => w.id === id);
  if (!win) return;
  win.el.remove();
  windows = windows.filter((w) => w.id !== id);
  if (windows.length === 0) document.getElementById("workspaceEmpty")?.classList.remove("hidden");
  refitTiles();
  onChange?.();
}

/** Scrolls a tile into view -- what "bringing a window to front" means
 * now that tiles sit in normal flow instead of an overlapping z-stack. */
export function bringToFront(win: GraphWindow) {
  win.el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  win.el.classList.add("graph-win-flash");
  setTimeout(() => win.el.classList.remove("graph-win-flash"), 900);
}

export function listWindows(): GraphWindow[] {
  return windows;
}

/** Re-scales every tile by the same factor until the whole set fits the
 * workspace without a vertical scrollbar, or until tiles hit MIN_SCALE
 * (readability floor -- past that point we accept a scrollbar rather
 * than render illegible charts). Always starts from full size, so
 * closing a tile lets the rest grow back. */
function refitTiles() {
  if (!workspaceEl || windows.length === 0) return;
  let scale = 1.0;
  applyScale(scale);
  while (workspaceEl.scrollHeight > workspaceEl.clientHeight + 1 && scale > MIN_SCALE) {
    scale = Math.max(MIN_SCALE, scale - 0.05);
    applyScale(scale);
  }
}

function applyScale(scale: number) {
  for (const w of windows) {
    w.el.style.width = `${Math.round(w.baseWidth * scale)}px`;
  }
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedRefit() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(refitTiles, 120);
}
