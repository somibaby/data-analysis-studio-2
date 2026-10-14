// grid.ts — a virtualized, Excel-like data grid.
//
// "Unlimited" rows are handled the way every serious grid handles them:
// the DOM only ever holds the rows currently scrolled into view (plus a
// small buffer), the full row count just makes the scrollbar the right
// size, and data is fetched from the Postgres-backed API in pages as you
// scroll. Tens of thousands of rows scroll exactly as smoothly as ten.
//
// Left as one file in the Oct 2026 restructuring rather than split like
// main.ts/stats.py/etc. -- it's one cohesive class, and splitting a
// class's methods across files means either exposing private state or
// reaching for a mixin pattern, real regression risk to already-correct
// virtualized-scroll/clipboard logic for a file-count benefit only.
// Already internally organized into these sections (search for the
// divider comments below): shell, loading, render, events, editing,
// keyboard, copy/paste, public API.
import { api } from "./api";
import type { DatasetSummary, SelRange } from "./types";
import { colLetter, escapeHtml, parseDelimited } from "./util";

type Row = string[];

export class Grid {
  static ROW_H = 28;
  static COL_W = 132;
  static ROWNUM_W = 54;
  static PAGE_SIZE = 300;
  static BUFFER = 12;

  el: HTMLElement;
  scrollEl!: HTMLElement;
  headerEl!: HTMLElement;
  sizerEl!: HTMLElement;
  rowsEl!: HTMLElement;

  dataset: DatasetSummary | null = null;
  cache = new Map<number, Row>();
  loadingPages = new Set<number>();
  totalRows = 0;

  selection: SelRange | null = null;
  editing: { r: number; c: number } | null = null;
  focused = false;
  private mouseDown = false;
  private editorEl: HTMLInputElement | null = null;

  /** Fired after any structural change (headers, row count) so the app
   * shell can refresh things like the chart-builder column pickers. */
  onSchemaChanged: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.el = container;
    this.buildShell();
    this.attachEvents();
  }

  // ---------------------------------------------------------------- shell
  private buildShell() {
    this.el.innerHTML = `
      <div class="ggrid-scroll" tabindex="0">
        <div class="ggrid-header"></div>
        <div class="ggrid-sizer"><div class="ggrid-rows"></div></div>
      </div>`;
    this.scrollEl = this.el.querySelector(".ggrid-scroll") as HTMLElement;
    this.headerEl = this.el.querySelector(".ggrid-header") as HTMLElement;
    this.sizerEl = this.el.querySelector(".ggrid-sizer") as HTMLElement;
    this.rowsEl = this.el.querySelector(".ggrid-rows") as HTMLElement;
  }

  // -------------------------------------------------------------- loading
  async loadDataset(ds: DatasetSummary) {
    this.dataset = ds;
    this.totalRows = ds.row_count;
    this.cache.clear();
    this.loadingPages.clear();
    this.selection = ds.row_count > 0 ? { r0: 0, c0: 0, r1: 0, c1: 0 } : null;
    this.renderHeader();
    this.updateSizer();
    this.scrollEl.scrollTop = 0;
    await this.ensureRange(0, Math.min(ds.row_count, Grid.PAGE_SIZE));
    this.renderVisible();
  }

  private pageOf(rowIndex: number) {
    return Math.floor(rowIndex / Grid.PAGE_SIZE);
  }

  private async ensureRange(startRow: number, endRow: number) {
    if (!this.dataset) return;
    const firstPage = this.pageOf(Math.max(0, startRow));
    const lastPage = this.pageOf(Math.max(0, endRow - 1));
    const fetches: Promise<void>[] = [];
    for (let p = firstPage; p <= lastPage; p++) {
      const offset = p * Grid.PAGE_SIZE;
      if (offset >= this.totalRows || this.loadingPages.has(p)) continue;
      const count = Math.min(Grid.PAGE_SIZE, this.totalRows - offset);
      let anyMissing = false;
      for (let i = 0; i < count; i++) {
        if (!this.cache.has(offset + i)) { anyMissing = true; break; }
      }
      if (!anyMissing) continue;
      this.loadingPages.add(p);
      const ds = this.dataset;
      fetches.push(
        api.getPage(ds.id, offset, Grid.PAGE_SIZE)
          .then((page) => {
            page.rows.forEach((row, i) => {
              this.cache.set(offset + i, row.map((v) => (v === null || v === undefined ? "" : String(v))));
            });
            this.loadingPages.delete(p);
          })
          .catch((err) => { console.error(err); this.loadingPages.delete(p); })
      );
    }
    if (fetches.length) await Promise.all(fetches);
  }

  // -------------------------------------------------------------- render
  private renderHeader() {
    if (!this.dataset) { this.headerEl.innerHTML = ""; return; }
    const headers = this.dataset.headers;

    // Worksheet-style column IDs (C1, C2, ...) above the user's own names,
    // Minitab's convention. Purely cosmetic -- the name row below (and all
    // the click/delete wiring on it) is unchanged.
    let idsHtml = `<div class="gcell ghead gheadid gcornerid" style="width:${Grid.ROWNUM_W}px;min-width:${Grid.ROWNUM_W}px"></div>`;
    headers.forEach((_, i) => {
      idsHtml += `<div class="gcell ghead gheadid" style="width:${Grid.COL_W}px;min-width:${Grid.COL_W}px">C${i + 1}</div>`;
    });
    idsHtml += `<div class="gcell ghead gheadid" style="width:${Grid.COL_W}px;min-width:${Grid.COL_W}px"></div>`;

    let namesHtml = `<div class="gcell ghead gcorner" style="width:${Grid.ROWNUM_W}px;min-width:${Grid.ROWNUM_W}px" title="Select all"></div>`;
    headers.forEach((h, i) => {
      namesHtml += `<div class="gcell ghead gheadcol" data-col="${i}" style="width:${Grid.COL_W}px;min-width:${Grid.COL_W}px">
        <span class="glabel">${escapeHtml(h || colLetter(i))}</span>
        <span class="gdelcol" data-col="${i}" title="Delete column">&times;</span>
      </div>`;
    });
    namesHtml += `<div class="gcell ghead gaddcol" title="Add column">+</div>`;
    this.headerEl.innerHTML = `<div class="ggrid-header-ids">${idsHtml}</div><div class="ggrid-header-names">${namesHtml}</div>`;

    this.headerEl.querySelector(".gcorner")?.addEventListener("click", () => {
      if (!this.dataset || this.totalRows === 0) return;
      this.selection = { r0: 0, c0: 0, r1: this.totalRows - 1, c1: Math.max(0, this.dataset.headers.length - 1) };
      this.renderVisible();
    });
    this.headerEl.querySelectorAll(".gheadcol").forEach((el) => {
      el.addEventListener("click", () => {
        if (!this.dataset || this.totalRows === 0) return;
        const c = parseInt((el as HTMLElement).dataset.col as string, 10);
        this.selection = { r0: 0, c0: c, r1: this.totalRows - 1, c1: c };
        this.renderVisible();
      });
    });
    this.headerEl.querySelectorAll(".gdelcol").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        const c = parseInt((el as HTMLElement).dataset.col as string, 10);
        if (!this.dataset || this.dataset.headers.length <= 1) { alert("Need at least one column."); return; }
        const label = this.dataset.headers[c] || colLetter(c);
        if (!confirm(`Delete column "${label}"?`)) return;
        const res = await api.deleteColumn(this.dataset.id, c);
        this.dataset.headers = res.headers;
        this.cache.forEach((row) => row.splice(c, 1));
        this.renderHeader();
        this.updateSizer();
        this.renderVisible();
        this.onSchemaChanged?.();
      });
    });
    this.headerEl.querySelector(".gaddcol")?.addEventListener("click", async () => {
      if (!this.dataset) return;
      const res = await api.addColumn(this.dataset.id);
      this.dataset.headers = res.headers;
      this.cache.forEach((row) => { while (row.length < this.dataset!.headers.length) row.push(""); });
      this.renderHeader();
      this.updateSizer();
      this.renderVisible();
      this.onSchemaChanged?.();
    });
  }

  private updateSizer() {
    const rowCount = Math.max(this.totalRows, 0) + 1; // +1 for the "add row" affordance
    this.sizerEl.style.height = `${rowCount * Grid.ROW_H}px`;
    const width = Grid.ROWNUM_W + (this.dataset?.headers.length ?? 0) * Grid.COL_W + Grid.COL_W;
    this.sizerEl.style.width = `${width}px`;
  }

  private rowWidth(): number {
    return Grid.ROWNUM_W + (this.dataset?.headers.length ?? 0) * Grid.COL_W;
  }

  private visibleRowRange() {
    const scrollTop = this.scrollEl.scrollTop;
    const viewportH = this.scrollEl.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / Grid.ROW_H) - Grid.BUFFER);
    const end = Math.min(this.totalRows, Math.ceil((scrollTop + viewportH) / Grid.ROW_H) + Grid.BUFFER);
    return { start, end };
  }

  private selRange() {
    if (!this.selection) return null;
    const { r0, c0, r1, c1 } = this.selection;
    return {
      rmin: Math.min(r0, r1), rmax: Math.max(r0, r1),
      cmin: Math.min(c0, c1), cmax: Math.max(c0, c1),
    };
  }

  private isSelected(r: number, c: number): boolean {
    const rng = this.selRange();
    if (!rng) return false;
    return r >= rng.rmin && r <= rng.rmax && c >= rng.cmin && c <= rng.cmax;
  }

  private isAnchor(r: number, c: number): boolean {
    return !!this.selection && this.selection.r0 === r && this.selection.c0 === c;
  }

  private renderVisible() {
    if (!this.dataset) { this.rowsEl.innerHTML = ""; return; }
    const { start, end } = this.visibleRowRange();
    const headers = this.dataset.headers;
    const rw = this.rowWidth();
    let html = "";
    for (let r = start; r < end; r++) {
      const row = this.cache.get(r);
      html += `<div class="grow" style="top:${r * Grid.ROW_H}px;height:${Grid.ROW_H}px;width:${rw}px">`;
      html += `<div class="gcell grownum" data-r="${r}" style="width:${Grid.ROWNUM_W}px;min-width:${Grid.ROWNUM_W}px">${r + 1}<span class="growdel" data-r="${r}" title="Delete row">&times;</span></div>`;
      for (let c = 0; c < headers.length; c++) {
        const raw = row ? row[c] ?? "" : "";
        const cls = ["gcell", "gdata"];
        if (this.isSelected(r, c)) cls.push("gsel");
        if (this.isAnchor(r, c)) cls.push("ganchor");
        if (!row) cls.push("gloading");
        html += `<div class="${cls.join(" ")}" data-r="${r}" data-c="${c}" style="width:${Grid.COL_W}px;min-width:${Grid.COL_W}px">${row ? escapeHtml(raw) : ""}</div>`;
      }
      html += `</div>`;
    }
    html += `<div class="grow gaddrow" style="top:${this.totalRows * Grid.ROW_H}px;height:${Grid.ROW_H}px;width:${rw}px">+ Add row</div>`;
    this.rowsEl.innerHTML = html;

    this.rowsEl.querySelectorAll(".grownum").forEach((el) => {
      el.addEventListener("click", () => {
        if (!this.dataset) return;
        const r = parseInt((el as HTMLElement).dataset.r as string, 10);
        this.selection = { r0: r, c0: 0, r1: r, c1: Math.max(0, this.dataset.headers.length - 1) };
        this.renderVisible();
      });
    });
    this.rowsEl.querySelectorAll(".growdel").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.stopPropagation();
        const r = parseInt((el as HTMLElement).dataset.r as string, 10);
        if (!this.dataset) return;
        await api.deleteRow(this.dataset.id, r);
        // The backend re-flows everything after r into the gap on the next
        // page fetch (it pages by row_index order, not by row_index value),
        // so every cached position at or after r is now stale, not just r
        // itself. Drop the whole cache and refetch what's on screen rather
        // than patching one slot -- patching left rows below the deleted
        // one showing the previous row's data until a full reload.
        this.cache.clear();
        this.loadingPages.clear();
        this.dataset.row_count = Math.max(0, this.dataset.row_count - 1);
        this.totalRows = this.dataset.row_count;
        this.updateSizer();
        const { start, end } = this.visibleRowRange();
        await this.ensureRange(start, end);
        this.renderVisible();
        this.onSchemaChanged?.();
      });
    });
    this.rowsEl.querySelector(".gaddrow")?.addEventListener("click", async () => {
      if (!this.dataset) return;
      const newIndex = this.totalRows;
      await api.updateCells(this.dataset.id, [{ row_index: newIndex, col_index: 0, value: "" }]);
      this.cache.set(newIndex, new Array(this.dataset.headers.length).fill(""));
      this.dataset.row_count += 1;
      this.totalRows = this.dataset.row_count;
      this.updateSizer();
      this.renderVisible();
    });

    this.syncBrowserSelection();
  }

  // ------------------------------------------------------------- events
  private attachEvents() {
    this.scrollEl.addEventListener("scroll", () => {
      this.onScroll();
    });

    this.scrollEl.addEventListener("mousedown", (e) => {
      const target = e.target as HTMLElement;
      const cell = target.closest(".gdata") as HTMLElement | null;
      this.focused = true;
      if (document.activeElement && document.activeElement !== document.body && (document.activeElement as HTMLElement).blur) {
        (document.activeElement as HTMLElement).blur();
      }
      this.scrollEl.focus();
      if (!cell) return;
      this.commitEdit();
      const r = parseInt(cell.dataset.r as string, 10);
      const c = parseInt(cell.dataset.c as string, 10);
      this.mouseDown = true;
      if (e.shiftKey && this.selection) {
        this.selection = { ...this.selection, r1: r, c1: c };
      } else {
        this.selection = { r0: r, c0: c, r1: r, c1: c };
      }
      this.renderVisible();
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.mouseDown) return;
      const target = e.target as HTMLElement;
      const cell = target.closest(".gdata") as HTMLElement | null;
      if (!cell || !this.selection) return;
      const r = parseInt(cell.dataset.r as string, 10);
      const c = parseInt(cell.dataset.c as string, 10);
      if (this.selection.r1 === r && this.selection.c1 === c) return;
      this.selection.r1 = r;
      this.selection.c1 = c;
      this.renderVisible();
    });
    window.addEventListener("mouseup", () => { this.mouseDown = false; });

    this.scrollEl.addEventListener("dblclick", (e) => {
      const cell = (e.target as HTMLElement).closest(".gdata") as HTMLElement | null;
      if (!cell) return;
      const r = parseInt(cell.dataset.r as string, 10);
      const c = parseInt(cell.dataset.c as string, 10);
      this.startEdit(r, c, null);
    });

    // Capture phase, deliberately: this must run before scrollEl's own
    // bubble-phase mousedown handler below, which re-renders the grid
    // (innerHTML) and detaches e.target from the document. Checking
    // containment after that re-render would always see a detached node
    // and wrongly treat every in-grid click as an outside click, clearing
    // focus right after it was set -- which breaks keyboard editing and
    // Ctrl+C immediately after any single click.
    document.addEventListener("mousedown", (e) => {
      if (!this.scrollEl.contains(e.target as Node) && !(e.target as HTMLElement).closest(".gcell-editor")) {
        this.focused = false;
      }
    }, true);

    document.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.addEventListener("copy", (e) => this.onCopy(e));
    document.addEventListener("paste", (e) => this.onPaste(e));
  }

  private async onScroll() {
    const { start, end } = this.visibleRowRange();
    this.renderVisible(); // render immediately with whatever is cached (shows blanks briefly)
    await this.ensureRange(start, end);
    this.renderVisible();
  }

  // ------------------------------------------------------------- editing
  private startEdit(r: number, c: number, initialChar: string | null) {
    if (!this.dataset) return;
    this.commitEdit();
    const cellEl = this.rowsEl.querySelector(`.gdata[data-r="${r}"][data-c="${c}"]`) as HTMLElement | null;
    if (!cellEl) return; // row not currently rendered (scrolled out) -- ignore
    this.editing = { r, c };
    const wrapRect = this.scrollEl.getBoundingClientRect();
    const rect = cellEl.getBoundingClientRect();
    const editor = document.createElement("input");
    editor.type = "text";
    editor.className = "gcell-editor";
    editor.style.left = `${rect.left - wrapRect.left + this.scrollEl.scrollLeft}px`;
    editor.style.top = `${rect.top - wrapRect.top + this.scrollEl.scrollTop}px`;
    editor.style.width = `${rect.width}px`;
    editor.style.height = `${rect.height}px`;
    const existing = this.cache.get(r)?.[c] ?? "";
    editor.value = initialChar !== null ? initialChar : existing;
    this.scrollEl.appendChild(editor);
    this.editorEl = editor;
    editor.focus();
    if (initialChar !== null) editor.setSelectionRange(editor.value.length, editor.value.length);
    else editor.select();

    editor.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Enter") { ev.preventDefault(); this.commitEdit(); this.moveSelection(1, 0); }
      else if (ev.key === "Tab") { ev.preventDefault(); this.commitEdit(); this.moveSelection(0, ev.shiftKey ? -1 : 1); }
      else if (ev.key === "Escape") { ev.preventDefault(); this.cancelEdit(); }
    });
    editor.addEventListener("blur", () => this.commitEdit());
  }

  private commitEdit() {
    const editor = this.editorEl;
    const editing = this.editing;
    // Clear the shared state before removing the editor: removing a
    // focused input fires a synchronous native 'blur', which re-enters
    // this method via the editor's own blur listener. Nulling first makes
    // that reentrant call a no-op instead of double-committing the value
    // (duplicate save) and double-removing the node (thrown DOM error).
    this.editorEl = null;
    this.editing = null;
    if (!editor || !editing || !this.dataset) {
      editor?.remove();
      return;
    }
    const { r, c } = editing;
    const value = editor.value;
    editor.remove();

    let row = this.cache.get(r);
    if (!row) { row = new Array(this.dataset.headers.length).fill(""); this.cache.set(r, row); }
    while (row.length <= c) row.push("");
    row[c] = value;

    api.updateCells(this.dataset.id, [{ row_index: r, col_index: c, value }])
      .then((res) => {
        if (this.dataset && res.headers.length !== this.dataset.headers.length) {
          this.dataset.headers = res.headers;
          this.renderHeader();
          this.updateSizer();
          this.onSchemaChanged?.();
        }
      })
      .catch((err) => console.error("cell save failed", err));

    if (r >= this.totalRows) {
      this.totalRows = r + 1;
      this.dataset.row_count = this.totalRows;
      this.updateSizer();
    }
    this.renderVisible();
  }

  private cancelEdit() {
    this.editorEl?.remove();
    this.editorEl = null;
    this.editing = null;
  }

  private moveSelection(dr: number, dc: number) {
    if (!this.selection || !this.dataset) return;
    const maxCol = Math.max(0, this.dataset.headers.length - 1);
    const r = Math.max(0, Math.min(Math.max(this.totalRows - 1, 0), this.selection.r0 + dr));
    const c = Math.max(0, Math.min(maxCol, this.selection.c0 + dc));
    this.selection = { r0: r, c0: c, r1: r, c1: c };
    this.ensureRowVisible(r);
    this.renderVisible();
  }

  private ensureRowVisible(r: number) {
    const top = r * Grid.ROW_H;
    const bottom = top + Grid.ROW_H;
    if (top < this.scrollEl.scrollTop) this.scrollEl.scrollTop = top;
    else if (bottom > this.scrollEl.scrollTop + this.scrollEl.clientHeight) {
      this.scrollEl.scrollTop = bottom - this.scrollEl.clientHeight;
    }
  }

  // ------------------------------------------------------------- keyboard
  private onKeyDown(e: KeyboardEvent) {
    if (!this.focused || this.editing || !this.selection || !this.dataset) return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (this.totalRows === 0) return;
      this.selection = { r0: 0, c0: 0, r1: this.totalRows - 1, c1: Math.max(0, this.dataset.headers.length - 1) };
      this.renderVisible();
      return;
    }

    const maxCol = Math.max(0, this.dataset.headers.length - 1);
    const maxRow = Math.max(0, this.totalRows - 1);
    const pageRows = Math.max(1, Math.floor(this.scrollEl.clientHeight / Grid.ROW_H));

    if (e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      let r = this.selection.r0;
      let c = this.selection.c0;
      if (e.key === "Home") { c = 0; if (e.ctrlKey || e.metaKey) r = 0; }
      else if (e.key === "End") { c = maxCol; if (e.ctrlKey || e.metaKey) r = maxRow; }
      else if (e.key === "PageUp") r = Math.max(0, r - pageRows);
      else r = Math.min(maxRow, r + pageRows);
      this.selection = { r0: r, c0: c, r1: r, c1: c };
      this.ensureRowVisible(r);
      this.renderVisible();
      return;
    }

    const nav: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (nav[e.key]) {
      e.preventDefault();
      const [dr, dc] = nav[e.key];
      if (e.shiftKey) {
        const maxCol = Math.max(0, this.dataset.headers.length - 1);
        this.selection.r1 = Math.max(0, Math.min(Math.max(this.totalRows - 1, 0), this.selection.r1 + dr));
        this.selection.c1 = Math.max(0, Math.min(maxCol, this.selection.c1 + dc));
        this.renderVisible();
      } else {
        this.moveSelection(dr, dc);
      }
      return;
    }
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      this.startEdit(this.selection.r0, this.selection.c0, null);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.clearSelection();
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Without this, the browser's native keypress-driven text insertion
      // still fires after startEdit() moves focus onto the new editor
      // input mid-event, inserting this same keystroke a second time.
      e.preventDefault();
      this.startEdit(this.selection.r0, this.selection.c0, e.key);
    }
  }

  async clearSelection() {
    if (!this.selection || !this.dataset) return;
    const rng = this.selRange()!;
    await this.ensureRange(rng.rmin, rng.rmax + 1);
    const updates = [];
    for (let r = rng.rmin; r <= rng.rmax; r++) {
      const row = this.cache.get(r) ?? new Array(this.dataset.headers.length).fill("");
      for (let c = rng.cmin; c <= rng.cmax; c++) {
        row[c] = "";
        updates.push({ row_index: r, col_index: c, value: "" });
      }
      this.cache.set(r, row);
    }
    this.renderVisible();
    await api.updateCells(this.dataset.id, updates);
  }

  // -------------------------------------------------------- copy / paste
  private syncBrowserSelection() {
    // Browsers only fire a 'copy' event if there's a live Selection, even
    // though we render our own highlight with CSS classes. Wrapping the
    // currently-rendered selected cells in a real Range satisfies that
    // requirement; user-select:none on .gdata keeps it invisible so it
    // doesn't visually double up with our .gsel styling.
    const rng = this.selRange();
    if (!rng) { window.getSelection()?.removeAllRanges(); return; }
    const cells = Array.from(this.rowsEl.querySelectorAll(".gsel")) as HTMLElement[];
    if (!cells.length) return;
    try {
      const range = document.createRange();
      range.setStartBefore(cells[0]);
      range.setEndAfter(cells[cells.length - 1]);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch { /* non-fatal */ }
  }

  private buildTsv(rng: { rmin: number; rmax: number; cmin: number; cmax: number }): string {
    const lines: string[] = [];
    for (let r = rng.rmin; r <= rng.rmax; r++) {
      const row = this.cache.get(r) ?? [];
      const cells: string[] = [];
      for (let c = rng.cmin; c <= rng.cmax; c++) cells.push(row[c] ?? "");
      lines.push(cells.join("\t"));
    }
    return lines.join("\n");
  }

  private onCopy(e: ClipboardEvent) {
    if (!this.focused || this.editing || !this.selection) return;
    const rng = this.selRange()!;
    let missing = false;
    for (let r = rng.rmin; r <= rng.rmax && !missing; r++) if (!this.cache.has(r)) missing = true;
    if (!missing) {
      e.clipboardData?.setData("text/plain", this.buildTsv(rng));
      e.preventDefault();
      return;
    }
    // needs a fetch first -- can't do this synchronously inside the copy
    // event, so fall back to the async Clipboard API.
    e.preventDefault();
    this.ensureRange(rng.rmin, rng.rmax + 1).then(() => {
      navigator.clipboard?.writeText(this.buildTsv(rng)).catch((err) => console.error("clipboard write failed", err));
    });
  }

  private async onPaste(e: ClipboardEvent) {
    if (!this.focused || this.editing || !this.selection || !this.dataset) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    await this.applyPastedText(text);
  }

  private async applyPastedText(text: string) {
    if (!this.selection || !this.dataset) return;
    const matrix = parseDelimited(text);
    const startR = this.selection.r0, startC = this.selection.c0;

    let headersChanged = false;
    const neededCols = startC + Math.max(...matrix.map((r) => r.length));
    if (neededCols > this.dataset.headers.length) headersChanged = true;

    const updates = [];
    for (let ri = 0; ri < matrix.length; ri++) {
      for (let ci = 0; ci < matrix[ri].length; ci++) {
        updates.push({ row_index: startR + ri, col_index: startC + ci, value: matrix[ri][ci] });
      }
    }
    const res = await api.updateCells(this.dataset.id, updates);
    this.dataset.headers = res.headers;

    for (let ri = 0; ri < matrix.length; ri++) {
      const r = startR + ri;
      let row = this.cache.get(r);
      if (!row) { row = new Array(this.dataset.headers.length).fill(""); this.cache.set(r, row); }
      while (row.length < this.dataset.headers.length) row.push("");
      for (let ci = 0; ci < matrix[ri].length; ci++) row[startC + ci] = matrix[ri][ci];
    }

    const endR = startR + matrix.length - 1;
    const endC = startC + Math.max(...matrix.map((r) => r.length)) - 1;
    this.selection = { r0: startR, c0: startC, r1: endR, c1: endC };
    if (endR + 1 > this.totalRows) {
      this.totalRows = endR + 1;
      this.dataset.row_count = this.totalRows;
    }
    if (headersChanged) this.renderHeader();
    this.updateSizer();
    this.renderVisible();
    if (headersChanged) this.onSchemaChanged?.();
  }

  // ---------------------------------------------------------- public API
  /** Every value in a given column, straight from the API in one request
   * (see /api/datasets/{id}/column/{col_index} in app.py) rather than
   * paging through the whole grid -- this is what keeps chart-building
   * and the live-stats panel fast at tens of thousands of rows. */
  async getColumnValues(colIndex: number): Promise<string[]> {
    if (!this.dataset) return [];
    const res = await api.getColumn(this.dataset.id, colIndex);
    return res.values.map((v) => (v === null || v === undefined ? "" : String(v)));
  }

  async getAllRows(): Promise<string[][]> {
    if (!this.dataset) return [];
    await this.ensureRange(0, this.totalRows);
    const out: string[][] = [];
    for (let r = 0; r < this.totalRows; r++) out.push(this.cache.get(r) ?? []);
    return out;
  }
}
