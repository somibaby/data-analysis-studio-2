//! spc-wasm — fast client-side statistics, compiled from Rust to
//! WebAssembly and called directly from the TypeScript frontend.
//!
//! This is a *different kind* of language link than the Python <-> JS one:
//! instead of talking over HTTP as JSON, the compiled .wasm binary is
//! loaded straight into the browser tab and its functions are called like
//! ordinary JavaScript functions (see frontend/src/wasmStats.ts), sharing
//! memory in the same process. It exists so the grid can show *live*
//! control limits and Cpk while you're still typing/pasting -- before ever
//! asking the Python backend to compute the authoritative, fuller report.
//!
//! Build with (from the wasm/ directory):
//!   wasm-pack build --target web --out-dir ../frontend/src/wasm-pkg
//!
//! Deliberately kept dependency-free (just wasm-bindgen) and returns hand
//! -built JSON strings instead of pulling in serde, to keep the crate small
//! and the build fast.

use wasm_bindgen::prelude::*;

fn mean(x: &[f64]) -> f64 {
    if x.is_empty() {
        return f64::NAN;
    }
    x.iter().sum::<f64>() / x.len() as f64
}

fn std_dev(x: &[f64]) -> f64 {
    let n = x.len() as f64;
    if n < 2.0 {
        return 0.0;
    }
    let m = mean(x);
    let var = x.iter().map(|v| (v - m).powi(2)).sum::<f64>() / (n - 1.0);
    var.sqrt()
}

fn moving_ranges(x: &[f64]) -> Vec<f64> {
    x.windows(2).map(|w| (w[1] - w[0]).abs()).collect()
}

/// Mean of a column of numbers, called live as the grid changes.
#[wasm_bindgen]
pub fn fast_mean(values: Vec<f64>) -> f64 {
    mean(&values)
}

/// Sample standard deviation (n-1 denominator), same convention as
/// stats.py on the Python side so the two never disagree.
#[wasm_bindgen]
pub fn fast_std(values: Vec<f64>) -> f64 {
    std_dev(&values)
}

/// Point-to-point moving ranges |x[i] - x[i-1]|, the building block of the
/// I-MR control chart.
#[wasm_bindgen]
pub fn fast_moving_ranges(values: Vec<f64>) -> Vec<f64> {
    moving_ranges(&values)
}

/// Individuals & Moving-Range control limits. Returns a small JSON string
/// (parsed on the TS side) rather than a struct, to avoid a serde
/// dependency in this crate.
#[wasm_bindgen]
pub fn fast_imr_limits(values: Vec<f64>) -> String {
    if values.len() < 2 {
        return "{\"error\":\"need at least 2 points\"}".to_string();
    }
    let mr = moving_ranges(&values);
    let x_bar = mean(&values);
    let mr_bar = mean(&mr);
    let d2: f64 = 1.128;
    let e2: f64 = 3.0 / d2;
    let i_ucl = x_bar + e2 * mr_bar;
    let i_lcl = x_bar - e2 * mr_bar;
    let mr_ucl = 3.267 * mr_bar;
    let sigma_within = mr_bar / d2;

    format!(
        "{{\"center\":{x_bar},\"ucl\":{i_ucl},\"lcl\":{i_lcl},\"mr_center\":{mr_bar},\"mr_ucl\":{mr_ucl},\"sigma_within\":{sigma_within}}}"
    )
}

/// Quick Xbar-R control limits for a flat array chopped into subgroups of
/// `subgroup_size` (drops a trailing partial subgroup, matching stats.py).
#[wasm_bindgen]
pub fn fast_xbar_r_limits(values: Vec<f64>, subgroup_size: usize) -> String {
    if subgroup_size < 2 || values.len() < subgroup_size {
        return "{\"error\":\"not enough data for this subgroup size\"}".to_string();
    }
    // A2/D3/D4/d2 for n = 2..10 (Montgomery SPC constants), same table as
    // the Python side's SPC_CONSTANTS.
    let table: [(usize, f64, f64, f64, f64); 9] = [
        (2, 1.880, 0.000, 3.267, 1.128),
        (3, 1.023, 0.000, 2.574, 1.693),
        (4, 0.729, 0.000, 2.282, 2.059),
        (5, 0.577, 0.000, 2.114, 2.326),
        (6, 0.483, 0.000, 2.004, 2.534),
        (7, 0.419, 0.076, 1.924, 2.704),
        (8, 0.373, 0.136, 1.864, 2.847),
        (9, 0.337, 0.184, 1.816, 2.970),
        (10, 0.308, 0.223, 1.777, 3.078),
    ];
    let n = subgroup_size.clamp(2, 10);
    let (_, a2, d3, d4, d2) = table[n - 2];

    let n_sub = values.len() / n;
    let mut means = Vec::with_capacity(n_sub);
    let mut ranges = Vec::with_capacity(n_sub);
    for i in 0..n_sub {
        let chunk = &values[i * n..i * n + n];
        let m = mean(chunk);
        let hi = chunk.iter().cloned().fold(f64::MIN, f64::max);
        let lo = chunk.iter().cloned().fold(f64::MAX, f64::min);
        means.push(m);
        ranges.push(hi - lo);
    }
    let xbar_bar = mean(&means);
    let r_bar = mean(&ranges);
    let xbar_ucl = xbar_bar + a2 * r_bar;
    let xbar_lcl = xbar_bar - a2 * r_bar;
    let r_ucl = d4 * r_bar;
    let r_lcl = d3 * r_bar;
    let sigma_within = r_bar / d2;

    format!(
        "{{\"xbar_center\":{xbar_bar},\"xbar_ucl\":{xbar_ucl},\"xbar_lcl\":{xbar_lcl},\"r_center\":{r_bar},\"r_ucl\":{r_ucl},\"r_lcl\":{r_lcl},\"sigma_within\":{sigma_within}}}"
    )
}

/// Instant Cp/Cpk estimate for live feedback while spec limits are being
/// typed in, ahead of asking Python for the full capability report.
#[wasm_bindgen]
pub fn fast_cpk(values: Vec<f64>, lsl: f64, usl: f64) -> String {
    let m = mean(&values);
    let s = std_dev(&values);
    if s == 0.0 || s.is_nan() {
        return "{\"error\":\"zero or undefined variance\"}".to_string();
    }
    let cp = (usl - lsl) / (6.0 * s);
    let cpu = (usl - m) / (3.0 * s);
    let cpl = (m - lsl) / (3.0 * s);
    let cpk = cpu.min(cpl);
    format!("{{\"mean\":{m},\"std\":{s},\"cp\":{cp},\"cpk\":{cpk}}}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mean_and_std_basic() {
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert!((mean(&x) - 3.0).abs() < 1e-9);
        assert!((std_dev(&x) - 1.5811388300841898).abs() < 1e-9);
    }

    #[test]
    fn moving_ranges_basic() {
        let x = vec![10.0, 12.0, 9.0];
        assert_eq!(moving_ranges(&x), vec![2.0, 3.0]);
    }

    #[test]
    fn imr_limits_are_symmetric_about_center() {
        let x = vec![10.0, 10.5, 9.8, 10.2, 9.9, 10.1, 10.0];
        let json = fast_imr_limits(x);
        assert!(json.contains("\"center\""));
        assert!(!json.contains("error"));
    }
}
