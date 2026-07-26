import { mmToM, calculateRelaxationTime, calculateMaxwellF0, calculateMaxwellForce } from './physics.js';

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
  
  // Define force function based on selected model type
  const getForceAtDepth = (xVal) => {
    if (modelType === "Maxwell") {
      const tau = calculateRelaxationTime(k, c);
      const v_m = Math.max(1e-6, vEffective / 1000);
      const x_m = xVal / 1000;
      const exponent = (v_m * tau) > 0 ? -x_m / (v_m * tau) : 0;
      return c * v_m * (1 - Math.exp(exponent));
    } else {
      return k * mmToM(xVal);
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
  
  // Calculate points and find range
  const pts = [];
  const minPts = [];
  const maxPts = [];
  let minF = Infinity;
  let maxF = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * T;
    const x = xOfT(t), v = vOfT(t);
    let f = 0;
    if (modelType === "Maxwell") {
      const tInCycle = t % Tc;
      f = calculateMaxwellForce(tInCycle, k, c, xTarget, vTarget, holdDuration, rampMin, rampMax);
    } else {
      f = k * mmToM(x) + c * mmToM(v);
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
  
  // Generate points for one loading-unloading cycle (excluding hold phase)
  // Loading phase: x goes from 0 to xTarget, ẋ = v_effective
  // Unloading phase: x goes from xTarget back to 0, ẋ = -v_effective
  const pts = [];
  const minPts = [];
  const maxPts = [];
  
  // 50 points for loading
  for (let i = 0; i <= 50; i++) {
    const x = (i / 50) * xTarget;
    const f = k * mmToM(x) + c * v_effective_m;
    pts.push({ x, f, phase: 'loading' });
  }
  // 50 points for unloading
  for (let i = 0; i <= 50; i++) {
    const x = xTarget - (i / 50) * xTarget;
    const f = k * mmToM(x) - c * v_effective_m;
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
