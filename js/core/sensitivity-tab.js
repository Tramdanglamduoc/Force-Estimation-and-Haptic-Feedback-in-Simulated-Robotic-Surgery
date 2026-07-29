import { tissueConfig } from '../config/tissue-config.js';
import { toolConfig } from '../config/tool-config.js';
import { mmToM, calculateEffectiveStiffness, computeTotalForce, runBootstrap } from '../physics.js';
import { calculateRampT, calculateEffectiveVelocity } from '../plots.js';
import { getPercentiles } from './bootstrap-ci.js';

// Table sorting state
let currentSortColumn = "swing";
let currentSortAsc = false;

/**
 * Derives lumped k and c from material and tool parameters
 */
export function deriveLumpedParams(E_kPa, nu, c_mat_kPas, geom1, geom2, group) {
  const E_Pa = E_kPa * 1000;
  const c_mat_Pas = c_mat_kPas * 1000;
  let k = 0;
  let c = 0;
  if (group === "A") {
    const a_m = geom1 / 1000;
    const L_m = geom2 / 1000;
    k = (2 * a_m * E_Pa) / (1 - nu * nu);
    c = (c_mat_Pas * Math.PI * a_m * a_m) / L_m;
  } else {
    const A_m2 = geom1 * 1e-6;
    const h_m = geom2 / 1000;
    k = (E_Pa * A_m2) / h_m;
    c = (c_mat_Pas * A_m2) / h_m;
  }
  return { k, c };
}

/**
 * Helper to get the baseline parameters array with their properties
 */
function getActiveParams(els) {
  const selectedTool = els.toolTypeSelect.value;
  const toolCfg = toolConfig[selectedTool];
  const group = toolCfg ? toolCfg.group : "A";

  const params = [
    { name: "E", label: "Elastic Modulus E", val: parseFloat(els.eSlider.value), min: parseFloat(els.eSlider.min), max: parseFloat(els.eSlider.max) },
    { name: "nu", label: "Poisson's Ratio \u03BD", val: parseFloat(els.nuSlider.value), min: parseFloat(els.nuSlider.min), max: parseFloat(els.nuSlider.max) },
    { name: "c_material", label: "c_material", val: parseFloat(els.cMaterialSlider.value), min: parseFloat(els.cMaterialSlider.min), max: parseFloat(els.cMaterialSlider.max) }
  ];

  if (group === "A") {
    params.push({ name: "contactRadius", label: "Contact Radius a", val: parseFloat(els.contactRadiusSlider.value), min: parseFloat(els.contactRadiusSlider.min), max: parseFloat(els.contactRadiusSlider.max) });
    params.push({ name: "length", label: "Contact Length L", val: parseFloat(els.lSlider.value), min: parseFloat(els.lSlider.min), max: parseFloat(els.lSlider.max) });
  } else {
    params.push({ name: "jawArea", label: "Jaw Area A", val: parseFloat(els.jawAreaSlider.value), min: parseFloat(els.jawAreaSlider.min), max: parseFloat(els.jawAreaSlider.max) });
    params.push({ name: "thickness", label: "Tissue Thickness h", val: parseFloat(els.thicknessSlider.value), min: parseFloat(els.thicknessSlider.min), max: parseFloat(els.thicknessSlider.max) });
  }
  return params;
}

/**
 * Repopulate dropdowns for the heatmap selectors based on active tool group
 */
export function populateHeatmapDropdowns(els) {
  const params = getActiveParams(els);
  const prevX = els.heatmapParamXSelect.value;
  const prevY = els.heatmapParamYSelect.value;

  els.heatmapParamXSelect.innerHTML = "";
  els.heatmapParamYSelect.innerHTML = "";

  params.forEach((p, i) => {
    const optX = document.createElement("option");
    optX.value = p.name;
    optX.textContent = p.label;
    els.heatmapParamXSelect.appendChild(optX);

    const optY = document.createElement("option");
    optY.value = p.name;
    optY.textContent = p.label;
    els.heatmapParamYSelect.appendChild(optY);
  });

  // Restore selection or default to first/second
  if (params.some(p => p.name === prevX)) {
    els.heatmapParamXSelect.value = prevX;
  } else {
    els.heatmapParamXSelect.value = params[0].name;
  }

  if (params.some(p => p.name === prevY) && prevY !== els.heatmapParamXSelect.value) {
    els.heatmapParamYSelect.value = prevY;
  } else {
    els.heatmapParamYSelect.value = params[1] ? params[1].name : params[0].name;
  }

  updateDisabledDropdownOptions(els);
}

/**
 * Prevent selecting the same parameter for both heatmap X and Y axes
 */
function updateDisabledDropdownOptions(els) {
  const valX = els.heatmapParamXSelect.value;
  const valY = els.heatmapParamYSelect.value;

  Array.from(els.heatmapParamXSelect.options).forEach(opt => {
    opt.disabled = (opt.value === valY);
  });
  Array.from(els.heatmapParamYSelect.options).forEach(opt => {
    opt.disabled = (opt.value === valX);
  });
}

/**
 * Initialize Sensitivity & Uncertainty tab controls
 */
export function initSensitivityTab(els, updateFn) {
  const pSlider = els.perturbPctSlider;
  const pInput = els.perturbPctInput;
  const pVal = els.perturbPctVal;

  if (pSlider && pInput && pVal) {
    pSlider.addEventListener("input", () => {
      pInput.value = pSlider.value;
      pVal.textContent = pSlider.value + "%";
      const min = parseFloat(pSlider.min), max = parseFloat(pSlider.max);
      const pct = ((pSlider.value - min) / (max - min)) * 100;
      pSlider.style.setProperty('--fill-pct', `${pct}%`);
      updateFn();
    });

    pInput.addEventListener("input", () => {
      let val = parseInt(pInput.value);
      if (isNaN(val)) return;
      val = Math.max(1, Math.min(20, val));
      pSlider.value = val;
      pVal.textContent = val + "%";
      const min = parseFloat(pSlider.min), max = parseFloat(pSlider.max);
      const pct = ((val - min) / (max - min)) * 100;
      pSlider.style.setProperty('--fill-pct', `${pct}%`);
      updateFn();
    });
  }

  if (els.heatmapParamXSelect && els.heatmapParamYSelect) {
    els.heatmapParamXSelect.addEventListener("change", () => {
      updateDisabledDropdownOptions(els);
      updateFn();
    });
    els.heatmapParamYSelect.addEventListener("change", () => {
      updateDisabledDropdownOptions(els);
      updateFn();
    });
  }

  // MC convergence trigger wiring
  if (els.recomputeConvergenceBtn) {
    els.recomputeConvergenceBtn.addEventListener("click", () => {
      runConvergenceCheck(els);
    });
  }

  // Bootstrap sample size N slider listener
  if (els.bootstrapNSlider) {
    els.bootstrapNSlider.addEventListener("input", () => {
      const N_opts = [100, 500, 1000, 2000, 5000];
      const sliderIdx = parseInt(els.bootstrapNSlider.value);
      const val = N_opts[sliderIdx] || 1000;
      if (els.bootstrapNVal) {
        els.bootstrapNVal.textContent = val;
      }
      const min = parseFloat(els.bootstrapNSlider.min) || 0;
      const max = parseFloat(els.bootstrapNSlider.max) || 4;
      const pct = ((sliderIdx - min) / (max - min)) * 100;
      els.bootstrapNSlider.style.setProperty('--fill-pct', `${pct}%`);
      updateFn();
    });
  }

  // Cross-tissue comparisons checkbox wiring
  if (els.compareTissueChecks) {
    els.compareTissueChecks.querySelectorAll("input[type=checkbox]").forEach(cb => {
      cb.addEventListener("change", updateFn);
    });
  }

  // Populate dropdowns initially
  populateHeatmapDropdowns(els);

  // Monitor toolTypeSelect changes to repopulate dropdown parameters dynamically
  if (els.toolTypeSelect) {
    els.toolTypeSelect.addEventListener("change", () => {
      populateHeatmapDropdowns(els);
      updateFn();
    });
  }
}

/**
 * Evaluate the force at baseline or perturbed values
 */
function evaluateForceForParams(paramOverrides, baselineParams, group, els) {
  const x = parseFloat(els.xSlider.value);
  const v = parseFloat(els.vSlider.value);
  const holdDuration = parseFloat(els.holdSlider.value);
  const rampMin = parseFloat(els.rampMinSlider.value);
  const rampMax = parseFloat(els.rampMaxSlider.value);
  const modelType = els.modelTypeSelect.value;
  const isHetero = els.heteroToggle && els.heteroToggle.classList.contains("on");
  const D_inclusion = els.inclusionDepthSlider ? parseFloat(els.inclusionDepthSlider.value) : 5.0;
  const stiffness_ratio = els.stiffnessRatioSlider ? parseFloat(els.stiffnessRatioSlider.value) : 1.0;

  // Resolve overridden parameter values
  const E = paramOverrides.E !== undefined ? paramOverrides.E : baselineParams.find(p => p.name === "E").val;
  const nu = paramOverrides.nu !== undefined ? paramOverrides.nu : baselineParams.find(p => p.name === "nu").val;
  const c_mat = paramOverrides.c_material !== undefined ? paramOverrides.c_material : baselineParams.find(p => p.name === "c_material").val;

  let geom1, geom2;
  if (group === "A") {
    geom1 = paramOverrides.contactRadius !== undefined ? paramOverrides.contactRadius : baselineParams.find(p => p.name === "contactRadius").val;
    geom2 = paramOverrides.length !== undefined ? paramOverrides.length : baselineParams.find(p => p.name === "length").val;
  } else {
    geom1 = paramOverrides.jawArea !== undefined ? paramOverrides.jawArea : baselineParams.find(p => p.name === "jawArea").val;
    geom2 = paramOverrides.thickness !== undefined ? paramOverrides.thickness : baselineParams.find(p => p.name === "thickness").val;
  }

  const derived = deriveLumpedParams(E, nu, c_mat, geom1, geom2, group);
  const kEff = calculateEffectiveStiffness(x, derived.k, isHetero, D_inclusion, stiffness_ratio);

  const rampT = calculateRampT(x, v, rampMin, rampMax);
  return computeTotalForce(kEff, derived.c, x, v, modelType, holdDuration, rampMin, rampMax, rampT / 2);
}

/**
 * Runs MC convergence check when the button is clicked
 */
function runConvergenceCheck(els) {
  const btn = els.recomputeConvergenceBtn;
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Computing...";

  // Short delay to let UI render the loading state
  setTimeout(() => {
    try {
      const selectedTool = els.toolTypeSelect.value;
      const toolCfg = toolConfig[selectedTool];
      const group = toolCfg ? toolCfg.group : "A";

      const E_kPa = parseFloat(els.eSlider.value);
      const nu = parseFloat(els.nuSlider.value);
      const cMaterial_kPa_s = parseFloat(els.cMaterialSlider.value);

      let geom1, geom2;
      if (group === "A") {
        geom1 = parseFloat(els.contactRadiusSlider.value);
        geom2 = parseFloat(els.lSlider.value);
      } else {
        geom1 = parseFloat(els.jawAreaSlider.value);
        geom2 = parseFloat(els.thicknessSlider.value);
      }

      const derived = deriveLumpedParams(E_kPa, nu, cMaterial_kPa_s, geom1, geom2, group);
      const currentX = parseFloat(els.xSlider.value);
      const currentV = parseFloat(els.vSlider.value);
      const currentHold = parseFloat(els.holdSlider.value);
      const currentRampMin = parseFloat(els.rampMinSlider.value);
      const currentRampMax = parseFloat(els.rampMaxSlider.value);
      const modelType = els.modelTypeSelect.value;

      // Snapped N values
      const N_opts = [100, 500, 1000, 2000, 5000];
      const sliderIdx = parseInt(els.bootstrapNSlider.value);
      const limitN = [100, 500, 1000, 2000, 5000][sliderIdx] || 1000;
      const nValues = N_opts.filter(n => n <= limitN);

      // Generate synthetic dataset ONCE
      const data = runBootstrapAndGenerateDataSingle(derived.k, derived.c, currentX, currentV, currentHold, currentRampMin, currentRampMax, modelType);
      
      const ciWidthsK = [];
      const ciWidthsC = [];

      nValues.forEach(n => {
        // Run bootstrap on the same dataset with different iteration size N
        const { k_boot, c_boot } = runBootstrap(data, n, modelType, currentX, currentV, currentHold, currentRampMin, currentRampMax);
        const [kMin, kMax] = getPercentiles(k_boot, 2.5, 97.5);
        const [cMin, cMax] = getPercentiles(c_boot, 2.5, 97.5);
        ciWidthsK.push(kMax - kMin);
        ciWidthsC.push(cMax - cMin);
      });

      import('../plots.js').then(({ drawConvergencePlot }) => {
        drawConvergencePlot(els.plotConvergence, nValues, { kWidths: ciWidthsK, cWidths: ciWidthsC });
      });
    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = "Recompute convergence";
    }
  }, 50);
}

// Wrapper for generateSyntheticData to keep local scope clean
function runBootstrapAndGenerateDataSingle(k, c, xTarget, vTarget, holdDuration, rampMin, rampMax, modelType) {
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
  const prng = mulberry32(42);
  
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
    
    const sd = Math.max(0.001, Math.abs(f_theoretical) * 0.05);
    const f_noisy = f_theoretical + nextGaussianSeeded(prng) * sd;
    data.push({ x: x_m, v: v_ms, f: f_noisy, t: t });
  }
  return data;
}

function calculateMaxwellForce(t, k, c, xTarget, vTarget, holdDuration, rampMin, rampMax) {
  const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
  const T = 2 * rampT + holdDuration;
  const tau = k > 0 ? c / k : 0;
  const xTarget_m = xTarget / 1000;
  const v_m = rampT > 0 ? xTarget_m / rampT : 0;
  
  if (t < rampT) {
    const exponent = tau > 0 ? -t / tau : 0;
    return c * v_m * (1 - Math.exp(exponent));
  } else if (t < T - rampT) {
    const F0 = c * v_m * (1 - Math.exp(tau > 0 ? -rampT / tau : 0));
    const exponent = tau > 0 ? -(t - rampT) / tau : 0;
    return F0 * Math.exp(exponent);
  } else if (t <= T) {
    const F0 = c * v_m * (1 - Math.exp(tau > 0 ? -rampT / tau : 0));
    const F_hold_end = tau > 0 ? F0 * Math.exp(-holdDuration / tau) : 0;
    const t_start = rampT + holdDuration;
    const exponent = tau > 0 ? -(t - t_start) / tau : 0;
    return (F_hold_end + c * v_m) * Math.exp(exponent) - c * v_m;
  }
  return 0;
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function nextGaussianSeeded(prng) {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Main update routine called from core render loop
 */
export function updateSensitivityTab(els) {
  const panel = document.getElementById("panel-sensitivity");
  if (!panel || !panel.classList.contains("active")) return;

  try {
    const selectedTool = els.toolTypeSelect.value;
    const toolCfg = toolConfig[selectedTool];
    const group = toolCfg ? toolCfg.group : "A";

  const baselineParams = getActiveParams(els);
  const pPct = parseInt(els.perturbPctSlider.value) || 5;

  // 1. Calculate Tornado swings
  const tornadoResults = [];
  const baselineForce = evaluateForceForParams({}, baselineParams, group, els);

  baselineParams.forEach(p => {
    const pertVal = (pPct / 100) * p.val;
    const plusVal = Math.min(p.max, Math.max(p.min, p.val + pertVal));
    const minusVal = Math.min(p.max, Math.max(p.min, p.val - pertVal));

    const forcePlus = evaluateForceForParams({ [p.name]: plusVal }, baselineParams, group, els);
    const forceMinus = evaluateForceForParams({ [p.name]: minusVal }, baselineParams, group, els);
    const swing = Math.abs(forcePlus - forceMinus);

    tornadoResults.push({
      name: p.name,
      label: p.label,
      val: p.val,
      plus: forcePlus,
      minus: forceMinus,
      swing: swing
    });
  });

  // Sort tornado results descending by swing
  tornadoResults.sort((a, b) => b.swing - a.swing);

  // Render Tornado Chart
  import('../plots.js').then(({ drawTornadoChart }) => {
    drawTornadoChart(els.plotTornado, tornadoResults);
  });

  // 2. Sobol Uncertainty Decomposition
  const modelType = els.modelTypeSelect.value;
  const sobolContainer = els.sobolDecompContainer;
  const sobolContent = document.getElementById("sobolContent");

  let sobolValues = null;

  if (modelType === "Maxwell") {
    if (sobolContent) {
      sobolContent.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px; font-style: italic; border: 1px dashed var(--border); border-radius: 8px;">
          Sobol decomposition currently only supported for Kelvin-Voigt
        </div>
      `;
    }
  } else if (!window.bootstrapCache) {
    if (sobolContent) {
      sobolContent.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px; font-style: italic;">
          Computing Monte Carlo bootstrap...
        </div>
      `;
    }
  } else {
    // Perform analytic variance decomposition
    const k_boot = window.bootstrapCache.k_boot;
    const c_boot = window.bootstrapCache.c_boot;

    const x = parseFloat(els.xSlider.value);
    const v = parseFloat(els.vSlider.value);
    const rampMin = parseFloat(els.rampMinSlider.value);
    const rampMax = parseFloat(els.rampMaxSlider.value);

    const x_m = mmToM(x);
    const v_effective = calculateEffectiveVelocity(x, v, rampMin, rampMax);
    const v_m = mmToM(v_effective);

    // Compute mean of bootstrap parameters
    const meanK = k_boot.reduce((a, b) => a + b, 0) / k_boot.length;
    const meanC = c_boot.reduce((a, b) => a + b, 0) / c_boot.length;

    // Compute variances
    const varK = k_boot.reduce((a, b) => a + Math.pow(b - meanK, 2), 0) / k_boot.length;
    const varC = c_boot.reduce((a, b) => a + Math.pow(b - meanC, 2), 0) / c_boot.length;

    // Compute covariance
    let covKC = 0;
    for (let i = 0; i < k_boot.length; i++) {
      covKC += (k_boot[i] - meanK) * (c_boot[i] - meanC);
    }
    covKC /= k_boot.length;

    const varF = Math.pow(x_m, 2) * varK + Math.pow(v_m, 2) * varC + 2 * x_m * v_m * covKC;

    let sk = 0;
    let sc = 0;
    let sInteraction = 0;
    let clampedFootnote = "";

    if (varF > 1e-12) {
      sk = (Math.pow(x_m, 2) * varK) / varF;
      sc = (Math.pow(v_m, 2) * varC) / varF;
      sInteraction = 1 - sk - sc;
      if (sInteraction < 0) {
        sInteraction = 0;
        clampedFootnote = "*Interaction term clamped to 0% due to negative covariance";
      }
    }

    const pctK = Math.round(sk * 100);
    const pctC = Math.round(sc * 100);
    const pctInt = Math.max(0, Math.round(sInteraction * 100));

    sobolValues = { k: pctK, c: pctC };

    if (sobolContent) {
      sobolContent.innerHTML = `
        <div style="font-size: 11px; color: var(--navy); display: flex; flex-direction: column; gap: 12px; width: 100%;">
          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
              <span>Derived Stiffness k variance (S_k)</span>
              <span>${pctK}%</span>
            </div>
            <div style="width: 100%; height: 8px; background: #EDF1F3; border-radius: 4px; overflow: hidden;">
              <div style="width: ${pctK}%; height: 100%; background: var(--elastic);"></div>
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
              <span>Derived Damping c variance (S_c)</span>
              <span>${pctC}%</span>
            </div>
            <div style="width: 100%; height: 8px; background: #EDF1F3; border-radius: 4px; overflow: hidden;">
              <div style="width: ${pctC}%; height: 100%; background: var(--viscous);"></div>
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
              <span>Cross covariance / Interaction</span>
              <span>${pctInt}%</span>
            </div>
            <div style="width: 100%; height: 8px; background: #EDF1F3; border-radius: 4px; overflow: hidden;">
              <div style="width: ${pctInt}%; height: 100%; background: var(--text-muted);"></div>
            </div>
          </div>
          ${clampedFootnote ? `<div class="note" style="margin-top: 4px; font-size: 9px; color: #B06A18;">${clampedFootnote}</div>` : ''}
        </div>
      `;
    }
  }

  // 3. Heatmap Sampling
  const paramXName = els.heatmapParamXSelect.value;
  const paramYName = els.heatmapParamYSelect.value;

  const paramX = baselineParams.find(p => p.name === paramXName);
  const paramY = baselineParams.find(p => p.name === paramYName);

  if (paramX && paramY) {
    const grid = [];
    const steps = 15;

    // Grid range bounded tightly to parameter sliders limits
    const xMin = paramX.min;
    const xMax = paramX.max;
    const yMin = paramY.min;
    const yMax = paramY.max;

    const xVals = [];
    const yVals = [];

    for (let i = 0; i < steps; i++) {
      xVals.push(xMin + (i / (steps - 1)) * (xMax - xMin));
      yVals.push(yMin + (i / (steps - 1)) * (yMax - yMin));
    }

    for (let j = 0; j < steps; j++) {
      const yVal = yVals[j];
      const row = [];
      for (let i = 0; i < steps; i++) {
        const xVal = xVals[i];
        const f = evaluateForceForParams({ [paramXName]: xVal, [paramYName]: yVal }, baselineParams, group, els);
        row.push(f);
      }
      grid.push(row);
    }

    import('../plots.js').then(({ drawInteractionHeatmap }) => {
      drawInteractionHeatmap(els.plotHeatmap, { grid, xVals, yVals, xLabel: paramX.label, yLabel: paramY.label });
    });
  }

  // 4. Parameter ranking table
  const rankingTableContainer = els.rankingTableContainer;
  if (rankingTableContainer) {
    // Generate combined parameters list
    const tableData = baselineParams.map(p => {
      const tor = tornadoResults.find(t => t.name === p.name);
      const swing = tor ? tor.swing : 0;
      
      let sobolVal = "N/A";
      if (modelType === "Kelvin-Voigt" && sobolValues) {
        if (p.name === "E" || p.name === "nu" || p.name === "contactRadius" || p.name === "jawArea") {
          sobolVal = sobolValues.k + "% (Stiffness)";
        } else if (p.name === "c_material" || p.name === "length" || p.name === "thickness") {
          sobolVal = sobolValues.c + "% (Damping)";
        }
      }
      return {
        name: p.name,
        label: p.label,
        swing: swing,
        sobol: sobolVal
      };
    });

    // Apply sorting
    tableData.sort((a, b) => {
      let valA = a[currentSortColumn];
      let valB = b[currentSortColumn];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return currentSortAsc ? -1 : 1;
      if (valA > valB) return currentSortAsc ? 1 : -1;
      return 0;
    });

    renderRankingTable(rankingTableContainer, tableData, els);
  }

  // 5. Cross-tissue comparison
  const compareTissueChecks = els.compareTissueChecks;
  if (compareTissueChecks) {
    const checkedTissues = Array.from(compareTissueChecks.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
    
    if (checkedTissues.length === 0) {
      import('../plots.js').then(({ drawComparisonBars }) => {
        drawComparisonBars(els.plotComparison, null);
      });
    } else {
      const comparisonResults = {};
      checkedTissues.forEach(tName => {
        const tCfg = tissueConfig[tName];
        if (tCfg) {
          const tE = (tCfg.E_tight[0] + tCfg.E_tight[1]) / 2;
          const tCMat = (tCfg.c_tight[0] + tCfg.c_tight[1]) / 2;
          const tNu = tCfg.nu ? tCfg.nu.default : 0.42;

          const tBaselineParams = [
            { name: "E", val: tE, min: tCfg.E_full[0], max: tCfg.E_full[1] },
            { name: "nu", val: tNu, min: tCfg.nu ? tCfg.nu.min : 0.3, max: tCfg.nu ? tCfg.nu.max : 0.49 },
            { name: "c_material", val: tCMat, min: tCfg.c_main[0], max: tCfg.c_main[1] }
          ];

          // Geometry parameters remain fixed at active slider values
          if (group === "A") {
            tBaselineParams.push({ name: "contactRadius", val: parseFloat(els.contactRadiusSlider.value), min: parseFloat(els.contactRadiusSlider.min), max: parseFloat(els.contactRadiusSlider.max) });
            tBaselineParams.push({ name: "length", val: parseFloat(els.lSlider.value), min: parseFloat(els.lSlider.min), max: parseFloat(els.lSlider.max) });
          } else {
            tBaselineParams.push({ name: "jawArea", val: parseFloat(els.jawAreaSlider.value), min: parseFloat(els.jawAreaSlider.min), max: parseFloat(els.jawAreaSlider.max) });
            tBaselineParams.push({ name: "thickness", val: parseFloat(els.thicknessSlider.value), min: parseFloat(els.thicknessSlider.min), max: parseFloat(els.thicknessSlider.max) });
          }

          comparisonResults[tName] = tBaselineParams.map(p => {
            const pertVal = (pPct / 100) * p.val;
            const plusVal = Math.min(p.max, Math.max(p.min, p.val + pertVal));
            const minusVal = Math.min(p.max, Math.max(p.min, p.val - pertVal));

            const forcePlus = evaluateForceForParams({ [p.name]: plusVal }, tBaselineParams, group, els);
            const forceMinus = evaluateForceForParams({ [p.name]: minusVal }, tBaselineParams, group, els);
            return {
              name: p.name,
              swing: Math.abs(forcePlus - forceMinus)
            };
          });
        }
      });

      import('../plots.js').then(({ drawComparisonBars }) => {
        drawComparisonBars(els.plotComparison, comparisonResults);
      });
    }
  }
  } catch (err) {
    console.error("Error in updateSensitivityTab:", err);
  }
}

function renderRankingTable(container, data, els) {
  const arrow = currentSortAsc ? "▲" : "▼";
  
  let html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 6px;">
      <thead>
        <tr style="border-bottom: 2px solid var(--border); font-weight: 700; color: var(--navy); text-align: left; background-color: #EDF1F3;">
          <th class="sortable-header" data-col="label" style="padding: 6px; cursor: pointer; user-select: none;">Parameter ${currentSortColumn === 'label' ? arrow : ''}</th>
          <th class="sortable-header" data-col="swing" style="padding: 6px; cursor: pointer; user-select: none; text-align: right;">Tornado swing ${currentSortColumn === 'swing' ? arrow : ''}</th>
          <th class="sortable-header" data-col="sobol" style="padding: 6px; cursor: pointer; user-select: none; text-align: right;">Sobol MC % ${currentSortColumn === 'sobol' ? arrow : ''}</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(r => {
    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 6px; font-weight: 600;">${r.label}</td>
        <td style="padding: 6px; text-align: right; font-family: monospace;">${r.swing.toFixed(4)} N</td>
        <td style="padding: 6px; text-align: right; color: var(--text-muted);">${r.sobol}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;

  // Bind sorting event listeners
  container.querySelectorAll(".sortable-header").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (currentSortColumn === col) {
        currentSortAsc = !currentSortAsc;
      } else {
        currentSortColumn = col;
        currentSortAsc = false;
      }
      // Re-trigger the render update
      import('./update-cycle.js').then(({ update }) => {
        update(els);
      });
    });
  });
}
