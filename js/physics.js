/**
 * Physics engine for simulated robotic surgery haptic feedback.
 * Implements Kelvin-Voigt viscoelastic model: F = k * x + c * v
 */

/**
 * Convert millimeters to meters (or mm/s to m/s)
 * @param {number} mm value in mm
 * @returns {number} value in meters
 */
export function mmToM(mm) {
  return mm / 1000;
}

/**
 * Calculate the elastic component of the Kelvin-Voigt force
 * @param {number} k stiffness (N/m)
 * @param {number} x_m depth (m)
 * @returns {number} elastic force (N)
 */
export function calculateElasticForce(k, x_m) {
  return k * x_m;
}

/**
 * Calculate the viscous component of the Kelvin-Voigt force
 * @param {number} c damping (Ns/m)
 * @param {number} v_m velocity (m/s)
 * @returns {number} viscous force (N)
 */
export function calculateViscousForce(c, v_m) {
  return c * v_m;
}

/**
 * Calculate the total Kelvin-Voigt force
 * @param {number} fElastic elastic force component (N)
 * @param {number} fViscous viscous force component (N)
 * @returns {number} total force (N)
 */
export function calculateTotalForce(fElastic, fViscous) {
  return fElastic + fViscous;
}

// Box-Muller transform for Gaussian random variable with mean=0, std=1
export function nextGaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate N=50 synthetic noisy points along the Kelvin-Voigt model curve
 * @param {number} k stiffness (N/m)
 * @param {number} c damping (Ns/m)
 * @param {number} xTarget target indentation depth (mm)
 * @param {number} vTarget target indentation velocity (mm/s)
 * @param {number} holdDuration hold duration (s)
 * @param {number} rampMin min ramp time (s)
 * @param {number} rampMax max ramp time (s)
 * @returns {Array<{x: number, v: number, f: number, t: number}>} noisy dataset
 */
export function generateSyntheticData(k, c, xTarget, vTarget, holdDuration, rampMin, rampMax) {
  const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
  const T = 2 * rampT + holdDuration;
  
  function xOfT(t) {
    if (t < rampT) return xTarget * (t / rampT);
    if (t < T - rampT) return xTarget;
    return xTarget * Math.max(0, (T - t) / rampT);
  }
  
  function vOfT(t) {
    if (t < rampT) return xTarget / rampT;
    if (t < T - rampT) return 0;
    if (t <= T) return -xTarget / rampT;
    return 0;
  }
  
  const N = 50;
  const data = [];
  
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * T;
    const x_mm = xOfT(t);
    const v_mms = vOfT(t);
    
    const x_m = x_mm / 1000;
    const v_ms = v_mms / 1000;
    
    const f_theoretical = k * x_m + c * v_ms;
    
    // Add Gaussian noise (SD = 5% of theoretical force value)
    const sd = Math.max(0.001, Math.abs(f_theoretical) * 0.05);
    const f_noisy = f_theoretical + nextGaussian() * sd;
    
    data.push({ x: x_m, v: v_ms, f: f_noisy, t: t });
  }
  
  return data;
}

/**
 * Linear least-squares regression to fit k and c simultaneously on Kelvin-Voigt model:
 * F = k * x + c * v
 * @param {Array<{x: number, v: number, f: number}>} data dataset
 * @returns {{k: number, c: number}} fitted parameters
 */
export function fitLeastSquares(data) {
  let Sxx = 0, Sxv = 0, Svv = 0, SxF = 0, SvF = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    Sxx += d.x * d.x;
    Sxv += d.x * d.v;
    Svv += d.v * d.v;
    SxF += d.x * d.f;
    SvF += d.v * d.f;
  }
  
  const D = Sxx * Svv - Sxv * Sxv;
  let k_fit = 0;
  let c_fit = 0;
  
  if (Math.abs(D) > 1e-12) {
    k_fit = (SxF * Svv - SvF * Sxv) / D;
    c_fit = (Sxx * SvF - SxF * Sxv) / D;
  } else {
    k_fit = Sxx > 0 ? SxF / Sxx : 0;
    c_fit = Svv > 0 ? SvF / Svv : 0;
  }
  
  // Enforce physical constraints: stiffness and damping must be non-negative.
  // Using a simultaneous fit for stiffness k and damping c ensures unbiased parameter estimations.
  return {
    k: Math.max(0.1, k_fit),
    c: Math.max(0.0, c_fit)
  };
}

/**
 * Run non-parametric bootstrap resampling on the synthetic data
 * @param {Array<{x: number, v: number, f: number}>} data original dataset
 * @param {number} B number of bootstrap iterations
 * @returns {{k_boot: number[], c_boot: number[]}} bootstrap parameter arrays
 */
export function runBootstrap(data, B = 1000) {
  const k_boot = [];
  const c_boot = [];
  const N = data.length;
  
  for (let b = 0; b < B; b++) {
    const resampled = [];
    for (let i = 0; i < N; i++) {
      const idx = Math.floor(Math.random() * N);
      resampled.push(data[idx]);
    }
    const fit = fitLeastSquares(resampled);
    k_boot.push(fit.k);
    c_boot.push(fit.c);
  }
  
  return { k_boot, c_boot };
}
