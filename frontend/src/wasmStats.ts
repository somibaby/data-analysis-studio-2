// wasmStats.ts — the Rust <-> TypeScript link. Loads the WebAssembly
// module compiled from wasm/src/lib.rs (via `wasm-pack build --target web`)
// and calls its functions directly, in the same process, sharing memory
// with the JS runtime. That's a fundamentally different kind of language
// link than the HTTP+JSON one api.ts uses to talk to the Python backend:
// no network round trip, no serialization boundary beyond the function
// call itself.
//
// If the wasm module hasn't been built (Rust/wasm-pack not installed),
// this falls back to equivalent plain-TypeScript implementations so the
// app still works fully -- just without the compiled, shared-memory path.
// That fallback is deliberate: it means "full power" doesn't hard-require
// a Rust toolchain to be usable, only to get the fastest version.

type WasmModule = {
  fast_mean(values: number[]): number;
  fast_std(values: number[]): number;
  fast_moving_ranges(values: number[]): Float64Array;
  fast_imr_limits(values: number[]): string;
  fast_xbar_r_limits(values: number[], subgroup_size: number): string;
  fast_cpk(values: number[], lsl: number, usl: number): string;
};

let wasm: WasmModule | null = null;
export let wasmAvailable = false;

export async function initWasm(): Promise<boolean> {
  try {
    // This module only exists after running, inside wasm/:
    //   wasm-pack build --target web --out-dir ../frontend/src/wasm-pkg
    // @ts-ignore - path only resolves once the above build has run
    const mod = await import("./wasm-pkg/spc_wasm.js");
    await mod.default();
    wasm = mod as unknown as WasmModule;
    wasmAvailable = true;
    console.info("[wasm] SPC module loaded — live stats are running compiled Rust.");
  } catch (err) {
    wasmAvailable = false;
    console.info(
      "[wasm] SPC module not built yet — falling back to the TypeScript implementation " +
      "(functionally identical, just not compiled). To enable it, run inside wasm/: " +
      "wasm-pack build --target web --out-dir ../frontend/src/wasm-pkg",
      err
    );
  }
  return wasmAvailable;
}

// ---------------------------------------------------------------------
// Pure-TypeScript fallbacks. Kept numerically identical to lib.rs so
// switching between "wasm built" and "wasm not built" never changes an
// answer, only how fast it was computed.
// ---------------------------------------------------------------------
function meanJs(x: number[]): number {
  if (!x.length) return NaN;
  return x.reduce((a, b) => a + b, 0) / x.length;
}
function stdJs(x: number[]): number {
  if (x.length < 2) return 0;
  const m = meanJs(x);
  const v = x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1);
  return Math.sqrt(v);
}
function movingRangesJs(x: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < x.length; i++) out.push(Math.abs(x[i] - x[i - 1]));
  return out;
}

export interface FastImrLimits {
  center: number; ucl: number; lcl: number;
  mr_center: number; mr_ucl: number; sigma_within: number;
  error?: string;
}
export interface FastXbarRLimits {
  xbar_center: number; xbar_ucl: number; xbar_lcl: number;
  r_center: number; r_ucl: number; r_lcl: number; sigma_within: number;
  error?: string;
}
export interface FastCpk {
  mean: number; std: number; cp: number; cpk: number;
  error?: string;
}

// A2, D3, D4, d2 for subgroup sizes 2..10 — same table as SPC_CONSTANTS in
// backend/stats.py and the TABLE constant in wasm/src/lib.rs.
const XBAR_R_TABLE: Record<number, [number, number, number, number]> = {
  2: [1.880, 0.000, 3.267, 1.128], 3: [1.023, 0.000, 2.574, 1.693],
  4: [0.729, 0.000, 2.282, 2.059], 5: [0.577, 0.000, 2.114, 2.326],
  6: [0.483, 0.000, 2.004, 2.534], 7: [0.419, 0.076, 1.924, 2.704],
  8: [0.373, 0.136, 1.864, 2.847], 9: [0.337, 0.184, 1.816, 2.970],
  10: [0.308, 0.223, 1.777, 3.078],
};

export function fastMean(values: number[]): number {
  return wasm ? wasm.fast_mean(values) : meanJs(values);
}

export function fastStd(values: number[]): number {
  return wasm ? wasm.fast_std(values) : stdJs(values);
}

export function fastImrLimits(values: number[]): FastImrLimits {
  if (wasm) return JSON.parse(wasm.fast_imr_limits(values));
  if (values.length < 2) return { error: "need at least 2 points" } as FastImrLimits;
  const mr = movingRangesJs(values);
  const xBar = meanJs(values);
  const mrBar = meanJs(mr);
  const d2 = 1.128, e2 = 3 / d2;
  return {
    center: xBar, ucl: xBar + e2 * mrBar, lcl: xBar - e2 * mrBar,
    mr_center: mrBar, mr_ucl: 3.267 * mrBar, sigma_within: mrBar / d2,
  };
}

export function fastXbarRLimits(values: number[], subgroupSize: number): FastXbarRLimits {
  if (wasm) return JSON.parse(wasm.fast_xbar_r_limits(values, subgroupSize));
  const n = Math.min(10, Math.max(2, Math.round(subgroupSize)));
  if (values.length < n) return { error: "not enough data for this subgroup size" } as FastXbarRLimits;
  const [a2, d3, d4, d2] = XBAR_R_TABLE[n];
  const nSub = Math.floor(values.length / n);
  const means: number[] = [], ranges: number[] = [];
  for (let i = 0; i < nSub; i++) {
    const chunk = values.slice(i * n, i * n + n);
    means.push(meanJs(chunk));
    ranges.push(Math.max(...chunk) - Math.min(...chunk));
  }
  const xbarBar = meanJs(means), rBar = meanJs(ranges);
  return {
    xbar_center: xbarBar, xbar_ucl: xbarBar + a2 * rBar, xbar_lcl: xbarBar - a2 * rBar,
    r_center: rBar, r_ucl: d4 * rBar, r_lcl: d3 * rBar, sigma_within: rBar / d2,
  };
}

export function fastCpk(values: number[], lsl: number, usl: number): FastCpk {
  if (wasm) return JSON.parse(wasm.fast_cpk(values, lsl, usl));
  const m = meanJs(values), s = stdJs(values);
  if (!s) return { error: "zero or undefined variance" } as FastCpk;
  const cp = (usl - lsl) / (6 * s);
  const cpu = (usl - m) / (3 * s), cpl = (m - lsl) / (3 * s);
  return { mean: m, std: s, cp, cpk: Math.min(cpu, cpl) };
}
