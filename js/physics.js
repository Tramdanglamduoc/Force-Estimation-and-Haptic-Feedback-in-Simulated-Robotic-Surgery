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
 * Calculate the Maxwell relaxation time constant (tau = c / k)
 */
export function calculateRelaxationTime(k, c) {
  return k > 0 ? c / k : 0;
}

/**
 * Calculate Maxwell F0 initial condition at start of hold phase
 */
export function calculateMaxwellF0(c, v_m, rampT, tau) {
  const exponent = tau > 0 ? -rampT / tau : 0;
  return c * v_m * (1 - Math.exp(exponent));
}

/**
 * Calculate analytical Maxwell force at a specific time t
 */
export function calculateMaxwellForce(t, k, c, xTarget, vTarget, holdDuration, rampMin, rampMax) {
  const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
  const T = 2 * rampT + holdDuration;
  const tau = calculateRelaxationTime(k, c);
  
  const xTarget_m = xTarget / 1000;
  const v_m = rampT > 0 ? xTarget_m / rampT : 0;
  
  if (t < rampT) {
    const exponent = tau > 0 ? -t / tau : 0;
    return c * v_m * (1 - Math.exp(exponent));
  } else if (t < T - rampT) {
    const F0 = calculateMaxwellF0(c, v_m, rampT, tau);
    const exponent = tau > 0 ? -(t - rampT) / tau : 0;
    return F0 * Math.exp(exponent);
  } else if (t <= T) {
    const F0 = calculateMaxwellF0(c, v_m, rampT, tau);
    const F_hold_end = tau > 0 ? F0 * Math.exp(-holdDuration / tau) : 0;
    const t_start = rampT + holdDuration;
    const exponent = tau > 0 ? -(t - t_start) / tau : 0;
    return (F_hold_end + c * v_m) * Math.exp(exponent) - c * v_m;
  }
  return 0;
}

/**
 * Generate N=50 synthetic noisy points along the active model curve
 * @param {number} k stiffness (N/m)
 * @param {number} c damping (Ns/m)
 * @param {number} xTarget target indentation depth (mm)
 * @param {number} vTarget target indentation velocity (mm/s)
 * @param {number} holdDuration hold duration (s)
 * @param {number} rampMin min ramp time (s)
 * @param {number} rampMax max ramp time (s)
 * @param {string} modelType model type ("Kelvin-Voigt" or "Maxwell")
 * @returns {Array<{x: number, v: number, f: number, t: number}>} noisy dataset
 */
export function generateSyntheticData(k, c, xTarget, vTarget, holdDuration, rampMin, rampMax, modelType = "Kelvin-Voigt") {
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
    
    let f_theoretical = 0;
    if (modelType === "Maxwell") {
      f_theoretical = calculateMaxwellForce(t, k, c, xTarget, vTarget, holdDuration, rampMin, rampMax);
    } else {
      f_theoretical = k * x_m + c * v_ms;
    }
    
    // Add Gaussian noise (SD = 5% of theoretical force value)
    const sd = Math.max(0.001, Math.abs(f_theoretical) * 0.05);
    const f_noisy = f_theoretical + nextGaussian() * sd;
    
    data.push({ x: x_m, v: v_ms, f: f_noisy, t: t });
  }
  
  return data;
}

/**
 * Linear least-squares regression to fit k and c simultaneously on active model
 * @param {Array<{x: number, v: number, f: number, t: number}>} data dataset
 * @param {string} modelType active model type
 * @param {number} xTarget target indentation depth (mm)
 * @param {number} vTarget target indentation velocity (mm/s)
 * @param {number} holdDuration hold duration (s)
 * @param {number} rampMin min ramp time (s)
 * @param {number} rampMax max ramp time (s)
 * @returns {{k: number, c: number}} fitted parameters
 */
export function fitLeastSquares(data, modelType = "Kelvin-Voigt", xTarget = 5, vTarget = 5, holdDuration = 1.0, rampMin = 0.1, rampMax = 1.2) {
  if (modelType === "Maxwell") {
    const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
    const holdStart = rampT;
    const holdEnd = rampT + holdDuration;
    
    // Filter the hold phase data points where force is strictly positive for logarithm
    const holdPoints = data.filter(d => d.t >= holdStart && d.t < holdEnd && d.f > 0.0001);
    
    let slope = 0;
    let intercept = 0;
    const n = holdPoints.length;
    
    if (n >= 2) {
      let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
      for (let i = 0; i < n; i++) {
        const dt = holdPoints[i].t - holdStart;
        const y = Math.log(holdPoints[i].f);
        sumX += dt;
        sumY += y;
        sumXX += dt * dt;
        sumXY += dt * y;
      }
      const denom = n * sumXX - sumX * sumX;
      if (Math.abs(denom) > 1e-12) {
        slope = (n * sumXY - sumX * sumY) / denom;
        intercept = (sumY - slope * sumX) / n;
      } else {
        slope = -1.0;
        intercept = Math.log(Math.max(1e-4, holdPoints[0].f));
      }
    } else {
      // Fallback if hold points are insufficient or noisy
      slope = -1.0;
      const validPoints = data.filter(d => d.f > 0.0001);
      intercept = Math.log(Math.max(1e-4, validPoints[0]?.f || 1.0));
    }
    
    const tau = slope < 0 ? -1 / slope : 0.1;
    const F0 = Math.exp(intercept);
    
    const xTarget_m = xTarget / 1000;
    const v_m = rampT > 0 ? xTarget_m / rampT : 0.001;
    const oneMinusExp = 1 - Math.exp(-rampT / Math.max(1e-6, tau));
    
    let c_fit = F0 / (v_m * Math.max(1e-6, oneMinusExp));
    let k_fit = c_fit / Math.max(1e-6, tau);
    
    return {
      k: Math.max(0.01, Math.min(2000.0, k_fit)),
      c: Math.max(0.0, Math.min(1000.0, c_fit))
    };
  }

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
export function runBootstrap(data, B = 1000, modelType = "Kelvin-Voigt", xTarget = 5, vTarget = 5, holdDuration = 1.0, rampMin = 0.1, rampMax = 1.2) {
  const k_boot = [];
  const c_boot = [];
  const N = data.length;
  
  for (let b = 0; b < B; b++) {
    const resampled = [];
    for (let i = 0; i < N; i++) {
      const idx = Math.floor(Math.random() * N);
      resampled.push(data[idx]);
    }
    const fit = fitLeastSquares(resampled, modelType, xTarget, vTarget, holdDuration, rampMin, rampMax);
    k_boot.push(fit.k);
    c_boot.push(fit.c);
  }
  
  return { k_boot, c_boot };
}
