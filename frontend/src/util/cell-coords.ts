// cell-coords.ts — spreadsheet-column lettering (A, B, ..., Z, AA, ...)
// and lenient numeric parsing of a grid cell's raw value. Named
// cell-coords.ts rather than grid.ts to avoid confusion with the Grid
// class in grid.ts, which these have no dependency on.
export function colLetter(n: number): string {
  let s = "";
  n++;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}
