import { mmToM } from './physics.js';

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

/**
 * Draw Force vs Depth plot
 * Shows elastic response across indentation range
 */
export function drawDepthPlot(k, xCurrent) {
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
  
  // Draw slope line F = k * x_m
  ctx.strokeStyle = "#378ADD";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const x = (i / 100) * xMax;
    const f = k * mmToM(x);
    const px = PAD_X + (x / xMax) * plotW;
    const py = H - PAD_Y - (f / fMax) * plotH;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  
  // Current point
  const fCurrent = k * mmToM(xCurrent);
  const px = PAD_X + (xCurrent / xMax) * plotW;
  const py = H - PAD_Y - (fCurrent / fMax) * plotH;
  ctx.fillStyle = "#0F6E56";
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, 2 * Math.PI);
  ctx.fill();
  
  // Axis titles
  drawAxisTitles(ctx, W, H, "depth (mm)", "force (N)");
}

/**
 * Draw Force vs Time plot
 * Shows one indent-hold-release cycle
 */
export function drawTimePlot(k, c, xTarget, vTarget, holdDuration, rampMin, rampMax) {
  const canvas = document.getElementById("plotTime");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const plotW = W - PAD_X - RIGHT_MARGIN;
  const plotH = H - PAD_Y - TOP_MARGIN;
  
  ctx.clearRect(0, 0, W, H);
  
  // Calculate dynamic rampT and total time T based on inputs and configurable bounds
  const rampT = calculateRampT(xTarget, vTarget, rampMin, rampMax);
  const T = 2 * rampT + holdDuration;
  
  function xOfT(t) {
    if (t < rampT) return xTarget * (t / rampT);
    if (t < T - rampT) return xTarget;
    return xTarget * ((T - t) / rampT);
  }
  function vOfT(t) {
    const dt = 0.01;
    return (xOfT(t + dt) - xOfT(t - dt)) / (2 * dt);
  }
  
  // Calculate points and find range
  const pts = [];
  let minF = Infinity;
  let maxF = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * T;
    const x = xOfT(t), v = vOfT(t);
    const f = k * mmToM(x) + c * mmToM(v);
    pts.push([t, f]);
    if (f < minF) minF = f;
    if (f > maxF) maxF = f;
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
