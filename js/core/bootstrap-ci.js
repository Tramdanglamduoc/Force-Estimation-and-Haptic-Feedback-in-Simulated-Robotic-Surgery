import { tissueConfig } from '../config/tissue-config.js';
import { toolConfig } from '../config/tool-config.js';
import {
  generateSyntheticData,
  runBootstrap,
  mmToM,
  calculateElasticForce,
  calculateViscousForce,
  calculateConfinementFactor
} from '../physics.js';
import { calculateEffectiveVelocity } from '../plots.js';

export function getPercentiles(arr, p1 = 2.5, p2 = 97.5) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx1 = Math.floor((p1 / 100) * sorted.length);
  const idx2 = Math.floor((p2 / 100) * sorted.length);
  return [sorted[idx1], sorted[idx2]];
}

export function runBootstrapAndUpdateUI(els) {
  const selectedTissue = els.tissueTypeSelect.value;
  const cfg = tissueConfig[selectedTissue];
  const selectedTool = els.toolTypeSelect.value;
  const toolCfg = toolConfig[selectedTool];
  if (!cfg || !toolCfg) return;

  // Get current values
  const currentE_kPa = parseFloat(els.eSlider.value);
  const currentCMat_kPa_s = parseFloat(els.cMaterialSlider.value);
  const currentCMat_Pa_s = currentCMat_kPa_s * 1000;
  const currentC = parseFloat(els.cSlider.value);
  const currentX = parseFloat(els.xSlider.value);
  const currentV = parseFloat(els.vSlider.value);
  const currentHold = parseFloat(els.holdSlider.value);
  const currentRampMin = parseFloat(els.rampMinSlider.value);
  const currentRampMax = parseFloat(els.rampMaxSlider.value);

  // Current deterministic k
  const E_Pa = currentE_kPa * 1000;
  let currentK = 0;
  let nu = 0;
  let a_mm = 0;
  let A_mm2 = 0;
  let h_mm = 0;

  if (toolCfg.group === "A") {
    a_mm = parseFloat(els.contactRadiusSlider.value);
    const a_m = a_mm / 1000;
    nu = parseFloat(els.nuSlider.value);
    currentK = (2 * a_m * E_Pa) / (1 - nu * nu);
  } else {
    A_mm2 = parseFloat(els.jawAreaSlider.value);
    const A_m2 = A_mm2 * 1e-6;
    h_mm = parseFloat(els.thicknessSlider.value);
    const h_m = h_mm / 1000;
    nu = parseFloat(els.nuSlider.value);
    const confinement = calculateConfinementFactor(nu);
    currentK = ((E_Pa * A_m2) / h_m) * confinement;
  }

  const modelType = els.modelTypeSelect ? els.modelTypeSelect.value : "Kelvin-Voigt";

  // Step 1: Generate synthetic noisy data using 5% relative SD
  const data = generateSyntheticData(currentK, currentC, currentX, currentV, currentHold, currentRampMin, currentRampMax, modelType);

  // Step 2 & 3: Run B=1000 bootstrap resamples using simultaneous 2x2 linear least-squares regression
  const { k_boot, c_boot } = runBootstrap(data, 1000, modelType, currentX, currentV, currentHold, currentRampMin, currentRampMax);

  // Store bootstrap distributions in a global cache
  window.bootstrapCache = {
    k_boot: k_boot,
    c_boot: c_boot,
    timestamp: Date.now()
  };

  // Step 4: Compute 95% confidence intervals (2.5th and 97.5th percentiles)
  const [kMinCI, kMaxCI] = getPercentiles(k_boot, 2.5, 97.5);
  const [cMinCI, cMaxCI] = getPercentiles(c_boot, 2.5, 97.5);

  // Step 5: Back-derive Modulus E confidence interval
  let E_min = 0;
  let E_max = 0;
  if (toolCfg.group === "A") {
    E_min = kMinCI * (1 - nu * nu) / (2 * a_mm);
    E_max = kMaxCI * (1 - nu * nu) / (2 * a_mm);
  } else {
    const confinement = calculateConfinementFactor(nu);
    E_min = (kMinCI * h_mm / A_mm2) / confinement;
    E_max = (kMaxCI * h_mm / A_mm2) / confinement;
  }

  // Back-derive Damping c_material confidence interval
  let cMat_min = 0;
  let cMat_max = 0;
  if (toolCfg.group === "A") {
    const a_m = a_mm / 1000;
    const L_mm = parseFloat(els.lSlider.value);
    const L_m = L_mm / 1000;
    cMat_min = (cMinCI * L_m / (Math.PI * a_m * a_m)) / 1000;
    cMat_max = (cMaxCI * L_m / (Math.PI * a_m * a_m)) / 1000;
  } else {
    const A_m2 = A_mm2 * 1e-6;
    const h_m = h_mm / 1000;
    const confinement = calculateConfinementFactor(nu);
    cMat_min = (cMinCI * h_m / A_m2 / confinement) / 1000;
    cMat_max = (cMaxCI * h_m / A_m2 / confinement) / 1000;
  }

  const halfE = (E_max - E_min) / 2;
  if (els.ciELabel) {
    els.ciELabel.textContent = `E = ${currentE_kPa.toFixed(1)} ± ${halfE.toFixed(1)} kPa`;
  }
  if (els.ciKLabel) {
    els.ciKLabel.innerHTML = `k &approx; ${currentK.toFixed(1)} N/m (range: ${kMinCI.toFixed(1)}&ndash;${kMaxCI.toFixed(1)} N/m)`;
  }
  const halfCMat = (cMat_max - cMat_min) / 2;
  if (els.ciCMaterialLabel) {
    els.ciCMaterialLabel.textContent = `c_mat = ${currentCMat_kPa_s.toFixed(1)} ± ${halfCMat.toFixed(1)} kPa·s`;
  }
  if (els.ciCLumpedLabel) {
    els.ciCLumpedLabel.innerHTML = `c &approx; ${currentC.toFixed(2)} Ns/m (range: ${cMinCI.toFixed(2)}&ndash;${cMaxCI.toFixed(2)} Ns/m)`;
  }

  // Update bars scaled relative to bootstrap interval itself
  if (els.ciE) {
    const diffE = E_max - E_min;
    const pctE = diffE > 0 ? ((currentE_kPa - E_min) / diffE) * 100 : 50;
    els.ciE.style.left = "0%";
    els.ciE.style.width = Math.min(100, Math.max(0, pctE)) + "%";
  }
  if (els.ciK) {
    const diffK = kMaxCI - kMinCI;
    const pctK = diffK > 0 ? ((currentK - kMinCI) / diffK) * 100 : 50;
    els.ciK.style.left = "0%";
    els.ciK.style.width = Math.min(100, Math.max(0, pctK)) + "%";
  }
  if (els.ciCMaterial) {
    const diffCMat = cMat_max - cMat_min;
    const pctCMat = diffCMat > 0 ? ((currentCMat_kPa_s - cMat_min) / diffCMat) * 100 : 50;
    els.ciCMaterial.style.left = "0%";
    els.ciCMaterial.style.width = Math.min(100, Math.max(0, pctCMat)) + "%";
  }
  if (els.ciCLumped) {
    const diffCLump = cMaxCI - cMinCI;
    const pctCLump = diffCLump > 0 ? ((currentC - cMinCI) / diffCLump) * 100 : 50;
    els.ciCLumped.style.left = "0%";
    els.ciCLumped.style.width = Math.min(100, Math.max(0, pctCLump)) + "%";
  }

  // Update elastic/viscous decomposition ± standard deviation if Monte Carlo is ON
  let pElasticSD = 0;
  if (k_boot && c_boot) {
    const x_m = mmToM(currentX);
    const v_effective = calculateEffectiveVelocity(currentX, currentV, currentRampMin, currentRampMax);
    const v_effective_m = mmToM(v_effective);
    
    const pElastic_boot = [];
    for (let i = 0; i < k_boot.length; i++) {
      let pe = 50;
      if (modelType === "Maxwell") {
        const tau = c_boot[i] / Math.max(1e-6, k_boot[i]);
        const v_m = Math.max(1e-6, v_effective_m);
        const exponent = (v_m * tau) > 0 ? -x_m / (v_m * tau) : 0;
        const tot = c_boot[i] * v_m * (1 - Math.exp(exponent));
        const xs = tot / Math.max(1e-6, k_boot[i]);
        pe = x_m > 0 ? (xs / x_m) * 100 : 100;
      } else {
        const fe = k_boot[i] * x_m;
        const fv = c_boot[i] * v_effective_m;
        const tot = fe + fv;
        pe = tot > 0 ? (fe / tot) * 100 : 0;
      }
      pElastic_boot.push(pe);
    }
    
    // Calculate mean and SD
    let sum = 0;
    for (let i = 0; i < pElastic_boot.length; i++) {
      sum += pElastic_boot[i];
    }
    const mean = sum / pElastic_boot.length;
    
    let variance = 0;
    for (let i = 0; i < pElastic_boot.length; i++) {
      variance += Math.pow(pElastic_boot[i] - mean, 2);
    }
    pElasticSD = Math.sqrt(variance / pElastic_boot.length);
  }

  const mcOn = els.mcToggle && els.mcToggle.classList.contains("on");

  // Recalculate deterministic percentages for display
  const x_m = mmToM(currentX);
  const v_effective = calculateEffectiveVelocity(currentX, currentV, currentRampMin, currentRampMax);
  const v_effective_m = mmToM(v_effective);
  
  let pElastic = 50;
  if (modelType === "Maxwell") {
    const tau = currentC / Math.max(1e-6, currentK);
    const v_m = Math.max(1e-6, v_effective_m);
    const exponent = (v_m * tau) > 0 ? -x_m / (v_m * tau) : 0;
    const tot = currentC * v_m * (1 - Math.exp(exponent));
    const xs = tot / Math.max(1e-6, currentK);
    pElastic = x_m > 0 ? Math.round((xs / x_m) * 100) : 100;
  } else {
    const fElastic = calculateElasticForce(currentK, x_m);
    const fViscous = calculateViscousForce(currentC, v_effective_m);
    const total = fElastic + fViscous;
    if (total > 0) {
      pElastic = Math.round((fElastic / total) * 100);
    } else {
      pElastic = 0;
    }
  }
  const pViscous = 100 - pElastic;

  if (mcOn) {
    if (els.elasticPct) els.elasticPct.textContent = `${pElastic}% ± ${Math.round(pElasticSD)}%`;
    if (els.viscousPct) els.viscousPct.textContent = `${pViscous}% ± ${Math.round(pElasticSD)}%`;
  } else {
    if (els.elasticPct) els.elasticPct.textContent = `${pElastic}%`;
    if (els.viscousPct) els.viscousPct.textContent = `${pViscous}%`;
  }

  // Update Sensitivity & Uncertainty tab if active to redraw Sobol variance using the newly computed bootstrap distributions
  const panel = document.getElementById("panel-sensitivity");
  if (panel && panel.classList.contains("active")) {
    import('./sensitivity-tab.js').then(({ updateSensitivityTab }) => {
      updateSensitivityTab(els);
    });
  }
}
