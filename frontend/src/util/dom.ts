// dom.ts — tiny DOM/string helpers with no cell/grid or CSV meaning.
export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}

export function uid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}
