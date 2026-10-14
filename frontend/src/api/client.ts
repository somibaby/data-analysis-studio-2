// client.ts — the one fetch() wrapper every method in datasets.ts and
// analysis.ts calls through: sends the request, throws with the
// response body on a non-2xx status, otherwise parses and returns the
// JSON body. This is the Python <-> TypeScript link in its most literal
// form -- a plain HTTP request carrying JSON, understood by both sides
// without either needing to know what language the other is written in.
export async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} -> HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
