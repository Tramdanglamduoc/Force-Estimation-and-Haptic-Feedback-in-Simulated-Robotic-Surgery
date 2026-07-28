import { mmToM, calculateRelaxationTime, calculateMaxwellF0, calculateMaxwellForce, calculateEffectiveStiffness } from './physics.js';

// Layout geometry constants
const PAD_X = 55;
const PAD_Y = 40;
const RIGHT_MARGIN = 15;
const TOP_MARGIN = 22;

export function calculateRampT(xTarget, vTarget, rampMin, rampMax) {
  return Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
}

export function calculateEffectiveVelocity(xTarget, vTarget, rampMin, rampMax) {
  const rampT = calculateRampT(xTarget, vTarget, rampMin, rampMax);
  return xTarget / rampT;
}

/**
 * Draw axes lines (X and Y)
 */
function drawAxes(ctx, W, H) {
  ctx.strokeStyle = "#D8DEE2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, H - PAD_Y);
  ctx.lineTo(W - RIGHT_MARGIN, H - PAD_Y);
  ctx.moveTo(PAD_X, H - PAD_Y);
  ctx.lineTo(PAD_X, TOP_MARGIN);
  ctx.stroke();
}

/**
 * Draw titles for X and Y axes
 */
function drawAxisTitles(ctx, W, H, xTitle, yTitle) {
  ctx.fillStyle = "#5C6B73";
  ctx.font = "9px sans-serif";
  
  const plotW = W - PAD_X - RIGHT_MARGIN;
  
  // Y-axis title (rotated 90 degrees counter-clockwise along left edge)
  ctx.save();
  ctx.translate(12, (H - PAD_Y + TOP_MARGIN) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();
  
  // X-axis title (centered horizontally in bottom margin)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(xTitle, PAD_X + plotW / 2, H - PAD_Y + 18);
}

/**
 * Highlight the 0.0 N line if it's within bounds
 */
function drawZeroLine(ctx, W, H, plotH, fMin, fMax) {
  if (fMin <= 0 && fMax >= 0) {
    const pyZero = H - PAD_Y - ((0 - fMin) / (fMax - fMin)) * plotH;
    ctx.strokeStyle = "#C4CDD5";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_X, pyZero);
    ctx.lineTo(W - RIGHT_MARGIN, pyZero);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

/**
 * Draw tick marks and labels on the X axis
 */
function drawXTicks(ctx, H, plotW, minVal, maxVal, divisions, decimals, suffix = "") {
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "#D8DEE2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#5C6B73";
  ctx.font = "9px sans-serif";
  for (let i = 0; i <= divisions; i++) {
    const val = minVal + (i / divisions) * (maxVal - minVal);
    const px = PAD_X + ((val - minVal) / (maxVal - minVal)) * plotW;
    
    ctx.beginPath();
    ctx.moveTo(px, H - PAD_Y);
    ctx.lineTo(px, H - PAD_Y + 4);
    ctx.stroke();
    
    ctx.fillText(val.toFixed(decimals) + suffix, px, H - PAD_Y + 8);
  }
}

/**
 * Draw grid lines, tick marks, and labels on the Y axis
 */
function drawYAxis(ctx, H, plotH, W, fMin, fMax, decimals, highlightZero = false) {
  ctx.strokeStyle = "#EAF0F4";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#5C6B73";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 5; i++) {
    const fVal = fMin + (i / 5) * (fMax - fMin);
    const py = H - PAD_Y - ((fVal - fMin) / (fMax - fMin)) * plotH;
    
    ctx.beginPath();
    ctx.strokeStyle = (highlightZero && fVal === 0) ? "#D8DEE2" : "#EAF0F4";
    ctx.moveTo(PAD_X, py);
    ctx.lineTo(W - RIGHT_MARGIN, py);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.strokeStyle = "#D8DEE2";
    ctx.moveTo(PAD_X - 4, py);
    ctx.lineTo(PAD_X, py);
    ctx.stroke();
    
    ctx.fillText(fVal.toFixed(decimals) + " N", PAD_X - 8, py);
  }
}

// Box-Muller transform for Gaussian random variable with mean=0, std=1
function nextGaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate percentiles (2.5% and 97.5%) of noisy force at a point
function getPercentilesWithNoise(fVal, N = 50) {
  const vals = [];
  const sd = Math.max(0.001, Math.abs(fVal) * 0.05);
  for (let i = 0; i < N; i++) {
    vals.push(fVal + nextGaussian() * sd);
  }
  vals.sort((a, b) => a - b);
  return [vals[1], vals[48]];
}

/**
 * Draw Force vs Depth plot
 * Shows elastic response across indentation range
 */
export function drawDepthPlot(k, xCurrent, mcOn, modelType = "Kelvin-Voigt", c = 10, vEffective = 5) {
  const canvas = document.getElementById("plotDepth");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const plotW = W - PAD_X - RIGHT_MARGIN;
  const plotH = H - PAD_Y - TOP_MARGIN;
  
  ctx.clearRect(0, 0, W, H);
  
  const xSlider = document.getElementById("xSlider");
  const kSlider = document.getElementById("kSlider");
  const xMax = xSlider ? parseFloat(xSlider.max) : 10;
  const kMax = kSlider ? parseFloat(kSlider.max) : 500;
  const fMax = kMax * mmToM(xMax);
  
  // Y ticks and grid lines
  drawYAxis(ctx, H, plotH, W, 0, fMax, 1, true);
  
  // X ticks and labels
  drawXTicks(ctx, H, plotW, 0, xMax, 5, 1);
  
  // Draw axes
  drawAxes(ctx, W, H);
  
  const heteroToggle = document.getElementById("heteroToggle");
  const isHetero = heteroToggle && heteroToggle.classList.contains("on");
  const inclusionDepthSlider = document.getElementById("inclusionDepthSlider");
  const D_inclusion = inclusionDepthSlider ? parseFloat(inclusionDepthSlider.value) : 5.0;
  const stiffnessRatioSlider = document.getElementById("stiffnessRatioSlider");
  const stiffness_ratio = stiffnessRatioSlider ? parseFloat(stiffnessRatioSlider.value) : 1.0;

  // Define force function based on selected model type
  const getForceAtDepth = (xVal) => {
    const kEff = calculateEffectiveStiffness(xVal, k, isHetero, D_inclusion, stiffness_ratio);
    if (modelType === "Maxwell") {
      const tau = calculateRelaxationTime(kEff, c);
      const v_m = Math.max(1e-6, vEffective / 1000);
      const x_m = xVal / 1000;
      const exponent = (v_m * tau) > 0 ? -x_m / (v_m * tau) : 0;
      return c * v_m * (1 - Math.exp(exponent));
    } else {
      return kEff * mmToM(xVal);
    }
  };

  // Draw shaded confidence band if Monte Carlo is ON
  if (mcOn) {
    const minPts = [];
    const maxPts = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * xMax;
      const f = getForceAtDepth(x);
      const [fMinCI, fMaxCI] = getPercentilesWithNoise(f);
      
      const px = PAD_X + (x / xMax) * plotW;
      const pyMin = H - PAD_Y - (fMinCI / fMax) * plotH;
      const pyMax = H - PAD_Y - (fMaxCI / fMax) * plotH;
      
      minPts.push({ x: px, y: pyMin });
      maxPts.push({ x: px, y: pyMax });
    }
    
    ctx.fillStyle = "rgba(55, 138, 221, 0.15)"; // semi-transparent blue matching #378ADD
    ctx.beginPath();
    ctx.moveTo(minPts[0].x, minPts[0].y);
    for (let i = 1; i < minPts.length; i++) {
      ctx.lineTo(minPts[i].x, minPts[i].y);
    }
    ctx.lineTo(maxPts[maxPts.length - 1].x, maxPts[maxPts.length - 1].y);
    for (let i = maxPts.length - 2; i >= 0; i--) {
      ctx.lineTo(maxPts[i].x, maxPts[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw curve
  ctx.strokeStyle = "#378ADD";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = (i / 100) * xMax;
    const f = getForceAtDepth(x);
    const px = PAD_X + (x / xMax) * plotW;
    const py = H - PAD_Y - (f / fMax) * plotH;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  
  // Current point
  const fCurrent = getForceAtDepth(xCurrent);
  const px = PAD_X + (xCurrent / xMax) * plotW;
  const py = H - PAD_Y - (fCurrent / fMax) * plotH;
  ctx.fillStyle = "#0F6E56";
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, 2 * Math.PI);
  ctx.fill();
  
  // Model footnote
  if (modelType === "Maxwell") {
    ctx.fillStyle = "#B06A18";
    ctx.font = "italic 9px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("shown at current velocity — Maxwell response depends on loading rate", W - RIGHT_MARGIN, TOP_MARGIN - 8);
  }

  // Axis titles
  drawAxisTitles(ctx, W, H, "depth (mm)", "force (N)");
}

/**
 * Draw Force vs Time plot
 * Shows one or multiple indent-hold-release cycles
 */
export function drawTimePlot(k, c, xTarget, vTarget, holdDuration, rampMin, rampMax, mcOn, modelType = "Kelvin-Voigt", isCyclicOn = false, cycleCount = 1) {
  const canvas = document.getElementById("plotTime");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const plotW = W - PAD_X - RIGHT_MARGIN;
  const plotH = H - PAD_Y - TOP_MARGIN;
  
  ctx.clearRect(0, 0, W, H);
  
  // Calculate dynamic rampT and single cycle period Tc based on inputs and configurable bounds
  const rampT = calculateRampT(xTarget, vTarget, rampMin, rampMax);
  const Tc = 2 * rampT + holdDuration;
  const N_cycles = (isCyclicOn && cycleCount > 0) ? cycleCount : 1;
  const T = N_cycles * Tc;
  
  function xOfT(t) {
    if (t >= T) return 0;
    const tInCycle = t % Tc;
    if (tInCycle < rampT) return xTarget * (tInCycle / rampT);
    if (tInCycle < Tc - rampT) return xTarget;
    return xTarget * Math.max(0, (Tc - tInCycle) / rampT);
  }
  function vOfT(t) {
    if (t >= T) return 0;
    const tInCycle = t % Tc;
    if (tInCycle < rampT) return xTarget / rampT;
    if (tInCycle < Tc - rampT) return 0;
    if (tInCycle <= Tc) return -xTarget / rampT;
    return 0;
  }
  
  const heteroToggle = document.getElementById("heteroToggle");
  const isHetero = heteroToggle && heteroToggle.classList.contains("on");
  const inclusionDepthSlider = document.getElementById("inclusionDepthSlider");
  const D_inclusion = inclusionDepthSlider ? parseFloat(inclusionDepthSlider.value) : 5.0;
  const stiffnessRatioSlider = document.getElementById("stiffnessRatioSlider");
  const stiffness_ratio = stiffnessRatioSlider ? parseFloat(stiffnessRatioSlider.value) : 1.0;

  // Calculate points and find range
  const pts = [];
  const minPts = [];
  const maxPts = [];
  let minF = Infinity;
  let maxF = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * T;
    const x = xOfT(t), v = vOfT(t);
    const kEff = calculateEffectiveStiffness(x, k, isHetero, D_inclusion, stiffness_ratio);
    let f = 0;
    if (modelType === "Maxwell") {
      const tInCycle = t % Tc;
      f = calculateMaxwellForce(tInCycle, kEff, c, xTarget, vTarget, holdDuration, rampMin, rampMax);
    } else {
      f = kEff * mmToM(x) + c * mmToM(v);
    }
    pts.push([t, f]);
    
    if (mcOn) {
      const [fMinCI, fMaxCI] = getPercentilesWithNoise(f);
      minPts.push(fMinCI);
      maxPts.push(fMaxCI);
      if (fMinCI < minF) minF = fMinCI;
      if (fMaxCI > maxF) maxF = fMaxCI;
    } else {
      if (f < minF) minF = f;
      if (f > maxF) maxF = f;
    }
  }
  
  // Handle case where range is zero
  if (minF === maxF) {
    minF = -1.0;
    maxF = 1.0;
  }
  
  // Add padding
  const fRange = maxF - minF;
  const padding = fRange > 0 ? fRange * 0.1 : 0.5;
  const fMin = minF - padding;
  const fMax = maxF + padding;
  
  // Y ticks and grid lines
  drawYAxis(ctx, H, plotH, W, fMin, fMax, 2, false);
  
  // Highlight 0.0 N line if it's inside the bounds
  drawZeroLine(ctx, W, H, plotH, fMin, fMax);
  
  // X ticks and labels
  drawXTicks(ctx, H, plotW, 0, T, 6, 1, "s");
  
  // Draw axes
  drawAxes(ctx, W, H);
  
  // Draw shaded confidence band if Monte Carlo is ON
  if (mcOn) {
    ctx.fillStyle = "rgba(29, 158, 117, 0.15)"; // semi-transparent green matching #1D9E75
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * T;
      const fMinCI = minPts[i];
      const px = PAD_X + (t / T) * plotW;
      const py = H - PAD_Y - ((fMinCI - fMin) / (fMax - fMin)) * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    for (let i = 100; i >= 0; i--) {
      const t = (i / 100) * T;
      const fMaxCI = maxPts[i];
      const px = PAD_X + (t / T) * plotW;
      const py = H - PAD_Y - ((fMaxCI - fMin) / (fMax - fMin)) * plotH;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw curve
  ctx.strokeStyle = "#1D9E75";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach(([t, f], i) => {
    const px = PAD_X + (t / T) * plotW;
    const py = H - PAD_Y - ((f - fMin) / (fMax - fMin)) * plotH;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();
  
  // Axis titles
  drawAxisTitles(ctx, W, H, "time (s)", "force (N)");
}

/**
 * Draw Hysteresis loop plot (Force vs Depth for one loading-then-unloading cycle)
 */
export function drawHysteresisPlot(k, c, xTarget, vTarget, rampMin, rampMax, mcOn) {
  const canvas = document.getElementById("plotHysteresis");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const plotW = W - PAD_X - RIGHT_MARGIN;
  const plotH = H - PAD_Y - TOP_MARGIN;
  
  ctx.clearRect(0, 0, W, H);
  
  const xSlider = document.getElementById("xSlider");
  const xMax = xSlider ? parseFloat(xSlider.max) : 10;
  
  // Calculate effective velocity
  const v_effective = calculateEffectiveVelocity(xTarget, vTarget, rampMin, rampMax);
  const v_effective_m = mmToM(v_effective);
  
  const heteroToggle = document.getElementById("heteroToggle");
  const isHetero = heteroToggle && heteroToggle.classList.contains("on");
  const inclusionDepthSlider = document.getElementById("inclusionDepthSlider");
  const D_inclusion = inclusionDepthSlider ? parseFloat(inclusionDepthSlider.value) : 5.0;
  const stiffnessRatioSlider = document.getElementById("stiffnessRatioSlider");
  const stiffness_ratio = stiffnessRatioSlider ? parseFloat(stiffnessRatioSlider.value) : 1.0;

  // Generate points for one loading-unloading cycle (excluding hold phase)
  // Loading phase: x goes from 0 to xTarget, ẋ = v_effective
  // Unloading phase: x goes from xTarget back to 0, ẋ = -v_effective
  const pts = [];
  const minPts = [];
  const maxPts = [];
  
  // 50 points for loading
  for (let i = 0; i <= 50; i++) {
    const x = (i / 50) * xTarget;
    const kEff = calculateEffectiveStiffness(x, k, isHetero, D_inclusion, stiffness_ratio);
    const f = kEff * mmToM(x) + c * v_effective_m;
    pts.push({ x, f, phase: 'loading' });
  }
  // 50 points for unloading
  for (let i = 0; i <= 50; i++) {
    const x = xTarget - (i / 50) * xTarget;
    const kEff = calculateEffectiveStiffness(x, k, isHetero, D_inclusion, stiffness_ratio);
    const f = kEff * mmToM(x) - c * v_effective_m;
    pts.push({ x, f, phase: 'unloading' });
  }
  
  // Find min and max force for axis limits
  let minF = Infinity;
  let maxF = -Infinity;
  pts.forEach((p, idx) => {
    if (mcOn) {
      const [fMinCI, fMaxCI] = getPercentilesWithNoise(p.f);
      minPts.push(fMinCI);
      maxPts.push(fMaxCI);
      if (fMinCI < minF) minF = fMinCI;
      if (fMaxCI > maxF) maxF = fMaxCI;
    } else {
      if (p.f < minF) minF = p.f;
      if (p.f > maxF) maxF = p.f;
    }
  });
  
  if (minF === maxF) {
    minF = -1.0;
    maxF = 1.0;
  }
  const fRange = maxF - minF;
  const padding = fRange > 0 ? fRange * 0.1 : 0.5;
  const fMin = minF - padding;
  const fMax = maxF + padding;
  
  // Y ticks and grid lines
  drawYAxis(ctx, H, plotH, W, fMin, fMax, 2, false);
  
  // Highlight 0.0 N line
  drawZeroLine(ctx, W, H, plotH, fMin, fMax);
  
  // X ticks and labels (depth in mm)
  drawXTicks(ctx, H, plotW, 0, xMax, 5, 1);
  
  // Draw axes
  drawAxes(ctx, W, H);
  
  // Draw shaded confidence band if Monte Carlo is ON
  if (mcOn) {
    ctx.fillStyle = "rgba(55, 138, 221, 0.15)";
    ctx.beginPath();
    // loading path (first 51 points)
    for (let i = 0; i <= 50; i++) {
      const px = PAD_X + (pts[i].x / xMax) * plotW;
      const py = H - PAD_Y - ((minPts[i] - fMin) / (fMax - fMin)) * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    // unloading path (next 51 points)
    for (let i = 51; i < pts.length; i++) {
      const px = PAD_X + (pts[i].x / xMax) * plotW;
      const py = H - PAD_Y - ((minPts[i] - fMin) / (fMax - fMin)) * plotH;
      ctx.lineTo(px, py);
    }
    // reverse path for upper bounds
    for (let i = pts.length - 1; i >= 51; i--) {
      const px = PAD_X + (pts[i].x / xMax) * plotW;
      const py = H - PAD_Y - ((maxPts[i] - fMin) / (fMax - fMin)) * plotH;
      ctx.lineTo(px, py);
    }
    for (let i = 50; i >= 0; i--) {
      const px = PAD_X + (pts[i].x / xMax) * plotW;
      const py = H - PAD_Y - ((maxPts[i] - fMin) / (fMax - fMin)) * plotH;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw loading path (solid line)
  ctx.strokeStyle = "#378ADD"; // blue for loading
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const px = PAD_X + (pts[i].x / xMax) * plotW;
    const py = H - PAD_Y - ((pts[i].f - fMin) / (fMax - fMin)) * plotH;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  
  // Draw unloading path (dashed line)
  ctx.strokeStyle = "#1D9E75"; // green for unloading
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let i = 51; i < pts.length; i++) {
    const px = PAD_X + (pts[i].x / xMax) * plotW;
    const py = H - PAD_Y - ((pts[i].f - fMin) / (fMax - fMin)) * plotH;
    if (i === 51) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]); // reset line dash
  
  // Highlight indicator dots
  const midLoadIdx = 25;
  const pL1 = { x: PAD_X + (pts[midLoadIdx].x / xMax) * plotW, y: H - PAD_Y - ((pts[midLoadIdx].f - fMin) / (fMax - fMin)) * plotH };
  ctx.fillStyle = "#378ADD";
  ctx.beginPath();
  ctx.arc(pL1.x, pL1.y, 4, 0, 2 * Math.PI);
  ctx.fill();
  
  const midUnloadIdx = 76;
  const pU1 = { x: PAD_X + (pts[midUnloadIdx].x / xMax) * plotW, y: H - PAD_Y - ((pts[midUnloadIdx].f - fMin) / (fMax - fMin)) * plotH };
  ctx.fillStyle = "#1D9E75";
  ctx.beginPath();
  ctx.arc(pU1.x, pU1.y, 4, 0, 2 * Math.PI);
  ctx.fill();
  
  // Labels for paths
  ctx.font = "8px sans-serif";
  ctx.fillStyle = "#378ADD";
  ctx.fillText("Loading (F = k·x + c·v)", pL1.x + 8, pL1.y - 2);
  ctx.fillStyle = "#1D9E75";
  ctx.fillText("Unloading (F = k·x - c·v)", pU1.x + 8, pU1.y + 8);
  
  // Axis titles
  drawAxisTitles(ctx, W, H, "depth (mm)", "force (N)");
}

// Seeded PRNG Mulberry32
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Seeded Gaussian PRNG
function nextGaussianSeeded(prng) {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Draw Sensor Simulation Plot
 */
export function drawSensorPlot(kEffective, c, xTarget, vTarget, holdDuration, rampMin, rampMax, modelType, isCyclicOn, cycleCount, els) {
  const canvas = els.plotSensor;
  if (!canvas) return;

  // Retrieve parameters
  const rate = parseFloat(els.sensorRateSlider.value) || 100;
  const dt_sample = 1.0 / rate;
  const sigma = parseFloat(els.sensorNoiseSlider.value) || 0;
  const latency = (parseFloat(els.sensorLatencySlider.value) || 0) / 1000.0;
  const bias = parseFloat(els.sensorBiasSlider.value) || 0;
  const step_size = parseFloat(els.sensorQuantSlider.value) || 0;
  const F_max = parseFloat(els.sensorSatSlider.value) || 0.5;
  const dropout_prob = (parseFloat(els.sensorDropoutSlider.value) || 0) / 100.0;

  // Cache invalidation key
  const cachedKey = `${kEffective}_${c}_${xTarget}_${vTarget}_${holdDuration}_${rampMin}_${rampMax}_${modelType}_${isCyclicOn}_${cycleCount}_${rate}_${sigma}_${latency}_${bias}_${step_size}_${F_max}_${dropout_prob}`;

  if (!canvas.datasetCache || canvas.datasetCache.key !== cachedKey) {
    // 1. Log dropout slider details for Bug 2 diagnosis
    const dropout_raw = parseFloat(els.sensorDropoutSlider.value) || 0;
    console.log("drawSensorPlot: received dropout_raw =", dropout_raw, "dropout_prob =", dropout_prob);

    // Initialize seeded PRNG
    const prng = mulberry32(42);

    const rampT = calculateRampT(xTarget, vTarget, rampMin, rampMax);
    const Tc = 2 * rampT + holdDuration;
    const N_cycles = (isCyclicOn && cycleCount > 0) ? cycleCount : 1;
    const T_total = N_cycles * Tc;

    // Retrieve parameters for dynamic stiffness calculation
    const heteroToggle = document.getElementById("heteroToggle");
    const isHetero = heteroToggle && heteroToggle.classList.contains("on");
    const inclusionDepthSlider = document.getElementById("inclusionDepthSlider");
    const D_inclusion = inclusionDepthSlider ? parseFloat(inclusionDepthSlider.value) : 5.0;
    const stiffnessRatioSlider = document.getElementById("stiffnessRatioSlider");
    const stiffness_ratio = stiffnessRatioSlider ? parseFloat(stiffnessRatioSlider.value) : 1.0;
    const kSlider = document.getElementById("kSlider");
    const k_background = kSlider ? parseFloat(kSlider.value) : kEffective;

    function xOfT(t) {
      if (t >= T_total) return 0;
      const tInCycle = t % Tc;
      if (tInCycle < rampT) return xTarget * (tInCycle / rampT);
      if (tInCycle < Tc - rampT) return xTarget;
      return xTarget * Math.max(0, (Tc - tInCycle) / rampT);
    }

    function vOfT(t) {
      if (t >= T_total) return 0;
      const tInCycle = t % Tc;
      if (tInCycle < rampT) return xTarget / rampT;
      if (tInCycle < Tc - rampT) return 0;
      if (tInCycle <= Tc) return -xTarget / rampT;
      return 0;
    }

    function getFTrue(t) {
      const x = xOfT(t), v = vOfT(t);
      const kEff = calculateEffectiveStiffness(x, k_background, isHetero, D_inclusion, stiffness_ratio);
      if (modelType === "Maxwell") {
        const tInCycle = t % Tc;
        return calculateMaxwellForce(tInCycle, kEff, c, xTarget, vTarget, holdDuration, rampMin, rampMax);
      } else {
        return kEff * mmToM(x) + c * mmToM(v);
      }
    }

    // Generate sensor discrete samples
    const samples = [];
    let prev_sensor = null;
    const total_samples = Math.floor(T_total / dt_sample);
    let held_count = 0;

    for (let i = 0; i <= total_samples; i++) {
      const t_sample = i * dt_sample;
      
      // 1. Delay & Sample
      const t_delayed = Math.max(0, t_sample - latency);
      const f_sampled = getFTrue(t_delayed);
      
      // 2. Bias
      const f_biased = f_sampled + bias;
      
      // 3. Gaussian Noise
      const noise = nextGaussianSeeded(prng) * sigma;
      const f_noisy = f_biased + noise;
      
      // 4. Quantization
      let f_quantized = f_noisy;
      if (step_size > 0) {
        f_quantized = Math.round(f_noisy / step_size) * step_size;
      }
      
      // 5. Saturation Clip
      let f_sensor_val = Math.max(0, Math.min(F_max, f_quantized));
      
      // 6. Packet Dropout (bypassed at i=0)
      let is_dropout = false;
      if (i > 0 && dropout_prob > 0) {
        const rand = prng();
        if (rand < dropout_prob) {
          is_dropout = true;
          held_count++;
        }
      }
      
      if (is_dropout && prev_sensor !== null) {
        f_sensor_val = prev_sensor;
      } else {
        prev_sensor = f_sensor_val;
      }
      
      samples.push({ t: t_sample, f: f_sensor_val });
    }

    console.log("drawSensorPlot: loop finished. total samples =", total_samples, "held (dropped) samples =", held_count);

    // ZOH interpolation helper
    function getFSensor(t) {
      if (samples.length === 0) return 0;
      const idx = Math.floor(t / dt_sample);
      const clampedIdx = Math.max(0, Math.min(samples.length - 1, idx));
      return samples[clampedIdx].f;
    }

    // Precompute F_true curve points for rendering (e.g. 500 points)
    const f_true_pts = [];
    const renderPts = 500;
    for (let i = 0; i <= renderPts; i++) {
      const t = (i / renderPts) * T_total;
      f_true_pts.push({ t: t, f: getFTrue(t) });
    }

    // Calculate RMSE (overall)
    const rmse_eval_pts = Math.max(10, Math.floor(100 * T_total));
    let sumSqError = 0;
    for (let i = 0; i < rmse_eval_pts; i++) {
      const t = (i / (rmse_eval_pts - 1)) * T_total;
      const f_tr = getFTrue(t);
      const f_sens = getFSensor(t);
      const err = f_tr - f_sens;
      sumSqError += err * err;
    }
    const rmse = Math.sqrt(sumSqError / rmse_eval_pts);

    // Store in cache
    canvas.datasetCache = {
      key: cachedKey,
      samples: samples,
      f_true_pts: f_true_pts,
      rmse: rmse,
      T_total: T_total,
      dt_sample: dt_sample
    };

    // Reset zoom state
    canvas.zoomState = { tMin: 0, tMax: T_total };
  }

  // Wire event handlers once
  if (!canvas.zoomEventsWired) {
    canvas.zoomEventsWired = true;

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const cache = canvas.datasetCache;
      if (!cache) return;

      const zoom = canvas.zoomState || { tMin: 0, tMax: cache.T_total };
      const tRange = zoom.tMax - zoom.tMin;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const plotW = canvas.width - PAD_X - RIGHT_MARGIN;
      const mouseT = zoom.tMin + ((mouseX - PAD_X) / plotW) * tRange;

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
      let newRange = tRange * zoomFactor;
      newRange = Math.max(0.05, Math.min(cache.T_total, newRange));

      const tMinNew = Math.max(0, mouseT - (mouseT - zoom.tMin) * (newRange / tRange));
      const tMaxNew = Math.min(cache.T_total, tMinNew + newRange);

      canvas.zoomState = { tMin: tMinNew, tMax: tMaxNew };
      renderSensorPlotWindow(canvas);
    });

    let isDragging = false;
    let startX = 0;
    let startTMin = 0;
    let startTMax = 0;

    canvas.addEventListener("mousedown", (e) => {
      const cache = canvas.datasetCache;
      if (!cache) return;
      isDragging = true;
      startX = e.clientX;
      const zoom = canvas.zoomState || { tMin: 0, tMax: cache.T_total };
      startTMin = zoom.tMin;
      startTMax = zoom.tMax;
      canvas.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const cache = canvas.datasetCache;
      if (!cache) return;

      const plotW = canvas.width - PAD_X - RIGHT_MARGIN;
      const tRange = startTMax - startTMin;
      const dx = e.clientX - startX;
      const dt = (dx / plotW) * tRange;

      let tMinNew = startTMin - dt;
      let tMaxNew = startTMax - dt;

      if (tMinNew < 0) {
        tMinNew = 0;
        tMaxNew = tRange;
      }
      if (tMaxNew > cache.T_total) {
        tMaxNew = cache.T_total;
        tMinNew = cache.T_total - tRange;
      }

      canvas.zoomState = { tMin: tMinNew, tMax: tMaxNew };
      renderSensorPlotWindow(canvas);
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        canvas.style.cursor = "default";
      }
    });
  }

  // Draw visible frame
  renderSensorPlotWindow(canvas);
}

/**
 * Render cached sensor plot window
 */
export function renderSensorPlotWindow(canvas) {
  const cache = canvas.datasetCache;
  if (!cache) return;
  const zoom = canvas.zoomState || { tMin: 0, tMax: cache.T_total };

  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const plotW = W - PAD_X - RIGHT_MARGIN;
  const plotH = H - PAD_Y - TOP_MARGIN;

  ctx.clearRect(0, 0, W, H);

  const tMin = zoom.tMin;
  const tMax = zoom.tMax;
  const tRange = tMax - tMin;

  // Find min/max F inside visible window for auto-scale
  let minF = Infinity;
  let maxF = -Infinity;

  cache.f_true_pts.forEach(p => {
    if (p.t >= tMin && p.t <= tMax) {
      if (p.f < minF) minF = p.f;
      if (p.f > maxF) maxF = p.f;
    }
  });

  cache.samples.forEach(s => {
    if (s.t >= tMin && s.t <= tMax) {
      if (s.f < minF) minF = s.f;
      if (s.f > maxF) maxF = s.f;
    }
  });

  if (minF === Infinity) {
    minF = -0.05;
    maxF = 0.05;
  }
  if (minF === maxF) {
    minF -= 0.05;
    maxF += 0.05;
  }

  const fRange = maxF - minF;
  const padding = fRange > 0 ? fRange * 0.1 : 0.05;
  const fMin = minF - padding;
  const fMax = maxF + padding;

  // Draw grid
  drawYAxis(ctx, H, plotH, W, fMin, fMax, 3, false);
  drawZeroLine(ctx, W, H, plotH, fMin, fMax);
  drawXTicks(ctx, H, plotW, tMin, tMax, 6, 2, "s");
  drawAxes(ctx, W, H);

  // Draw F_true (smooth green/teal line)
  ctx.strokeStyle = "#1D9E75";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  cache.f_true_pts.forEach(p => {
    if (p.t >= tMin && p.t <= tMax) {
      const px = PAD_X + ((p.t - tMin) / tRange) * plotW;
      const py = H - PAD_Y - ((p.f - fMin) / (fMax - fMin)) * plotH;
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
  });
  ctx.stroke();

  // Draw F_sensor (stepped red ZOH line)
  ctx.strokeStyle = "#E06666";
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  // Filter samples inside visible window (including boundary margins)
  const visibleSamples = cache.samples.filter(s => s.t >= tMin - cache.dt_sample && s.t <= tMax + cache.dt_sample);
  for (let i = 0; i < visibleSamples.length; i++) {
    const s = visibleSamples[i];
    const px = PAD_X + ((s.t - tMin) / tRange) * plotW;
    const py = H - PAD_Y - ((s.f - fMin) / (fMax - fMin)) * plotH;
    
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      const prev_s = visibleSamples[i - 1];
      const px_prev = PAD_X + ((s.t - tMin) / tRange) * plotW;
      const py_prev = H - PAD_Y - ((prev_s.f - fMin) / (fMax - fMin)) * plotH;
      ctx.lineTo(px_prev, py_prev);
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // Update RMSE Display
  const rmseDisplay = document.getElementById("sensorRmseDisplay");
  if (rmseDisplay) {
    rmseDisplay.textContent = cache.rmse.toFixed(4) + " N";
  }

  // Draw legend (high contrast, bold, matching line colors, repositioned above axes)
  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = "#1D9E75";
  ctx.fillText("Ground truth F_true(t)", PAD_X + 15, TOP_MARGIN - 8);
  ctx.fillStyle = "#E06666";
  ctx.fillText("Simulated sensor F_sensor(t)", PAD_X + 145, TOP_MARGIN - 8);

  // Axis titles
  drawAxisTitles(ctx, W, H, "time (s)", "force (N)");
}

