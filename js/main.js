import { initTabs } from './tabs.js';
import {
  mmToM,
  calculateElasticForce,
  calculateViscousForce,
  calculateTotalForce,
  nextGaussian,
  generateSyntheticData,
  fitLeastSquares,
  runBootstrap
} from './physics.js';
import { drawDepthPlot, drawTimePlot, calculateRampT, calculateEffectiveVelocity } from './plots.js';

/**
 * Update the visibility of the parameter uncertainty panel based on the Monte Carlo toggle state
 */
function updateMonteCarloVisibility() {
  const mcToggle = document.getElementById("mcToggle");
  const uncertaintyPanel = document.getElementById("uncertaintyPanel");
  const panelsRow = document.querySelector(".panels-row");
  if (mcToggle && uncertaintyPanel) {
    const isMcOn = mcToggle.classList.contains("on");
    if (isMcOn) {
      uncertaintyPanel.style.display = "";
      if (panelsRow) panelsRow.classList.remove("mc-off");
    } else {
      uncertaintyPanel.style.display = "none";
      if (panelsRow) panelsRow.classList.add("mc-off");
    }
  }
}

/**
 * Toggle the Monte Carlo switch on/off
 */
function toggleMonteCarlo() {
  const mcToggle = document.getElementById("mcToggle");
  if (mcToggle) {
    mcToggle.classList.toggle("on");
    updateMonteCarloVisibility();
  }
}

/**
 * Initialize event wiring and initial calculations for the physics model tab controls
 */
export function initPhysicsTab() {
  const kSlider = document.getElementById("kSlider");
  const cSlider = document.getElementById("cSlider");
  const xSlider = document.getElementById("xSlider");
  const vSlider = document.getElementById("vSlider");
  const holdSlider = document.getElementById("holdSlider");
  const rampMinSlider = document.getElementById("rampMinSlider");
  const rampMaxSlider = document.getElementById("rampMaxSlider");

  const kInput = document.getElementById("kInput");
  const cInput = document.getElementById("cInput");
  const xInput = document.getElementById("xInput");
  const vInput = document.getElementById("vInput");
  
  const kVal = document.getElementById("kVal");
  const cVal = document.getElementById("cVal");
  const xVal = document.getElementById("xVal");
  const vVal = document.getElementById("vVal");
  const holdVal = document.getElementById("holdVal");
  const rampMinVal = document.getElementById("rampMinVal");
  const rampMaxVal = document.getElementById("rampMaxVal");

  const nuSlider = document.getElementById("nuSlider");
  const nuInput = document.getElementById("nuInput");
  const nuVal = document.getElementById("nuVal");
  const nuSliderRow = document.getElementById("nuSliderRow");

  const eSlider = document.getElementById("eSlider");
  const eInput = document.getElementById("eInput");
  const eVal = document.getElementById("eVal");
  const eCaption = document.getElementById("eCaption");

  const cMaterialSlider = document.getElementById("cMaterialSlider");
  const cMaterialInput = document.getElementById("cMaterialInput");
  const cMaterialVal = document.getElementById("cMaterialVal");
  const cMaterialTooltip = document.getElementById("cMaterialTooltip");

  const contactRadiusSlider = document.getElementById("contactRadiusSlider");
  const contactRadiusInput = document.getElementById("contactRadiusInput");
  const contactRadiusVal = document.getElementById("contactRadiusVal");
  const contactRadiusNote = document.getElementById("contactRadiusNote");

  const lSlider = document.getElementById("lSlider");
  const lInput = document.getElementById("lInput");
  const lVal = document.getElementById("lVal");
  const lCaption = document.getElementById("lCaption");

  const jawAreaSlider = document.getElementById("jawAreaSlider");
  const jawAreaInput = document.getElementById("jawAreaInput");
  const jawAreaVal = document.getElementById("jawAreaVal");

  const thicknessSlider = document.getElementById("thicknessSlider");
  const thicknessInput = document.getElementById("thicknessInput");
  const thicknessVal = document.getElementById("thicknessVal");

  const groupAControls = document.getElementById("groupAControls");
  const groupBControls = document.getElementById("groupBControls");

  const tissueTypeSelect = document.getElementById("tissueType");
  const toolTypeSelect = document.getElementById("toolType");

  if (!kSlider || !cSlider || !xSlider || !vSlider || !holdSlider || !rampMinSlider || !rampMaxSlider) return;

  const tissueConfig = {
    "Liver": {
      name: "Liver (excluding capsule)",
      E_full: [1.0, 4.0],
      E_tight: [1.0, 3.0],
      c_main: [2.0, 10.0],
      c_tight: [2.0, 6.0],
      nu: { min: 0.30, max: 0.45, default: 0.42, step: 0.01 },
      priority: "in vivo > in situ > ex vivo"
    },
    "Kidney": {
      name: "Kidney (parenchyma, excluding capsule)",
      E_full: [1.0, 5.0],
      E_tight: [1.0, 3.0],
      c_main: [2.0, 10.0],
      c_tight: [2.0, 6.0],
      nu: { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
      priority: "in vivo > in situ > ex vivo"
    },
    "Spleen": {
      name: "Spleen (parenchyma, excluding capsule)",
      E_full: [1.0, 4.0],
      E_tight: [1.5, 3.0],
      c_main: [2.0, 8.0],
      c_tight: [2.0, 5.0],
      nu: { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
      priority: "in vivo > in situ > ex vivo"
    }
  };

  const toolConfig = {
    "Needle tip": { group: "A", min: 0.29, max: 0.65, default: 0.29, step: 0.01, minL: 0.5, maxL: 5.0, defaultL: 2.0, stepL: 0.1 },
    "Blunt palpation probe": { group: "A", min: 2.5, max: 5.0, default: 2.5, step: 0.1, minL: 1.0, maxL: 10.0, defaultL: 5.0, stepL: 0.1 },
    "Monopolar hook/spatula": { group: "A", min: 0.3, max: 0.8, default: 0.3, step: 0.01, showNote: true, minL: 0.5, maxL: 3.0, defaultL: 1.5, stepL: 0.1 },
    "Suction/irrigation cannula tip": { group: "A", min: 1.5, max: 5.0, default: 1.5, step: 0.1, minL: 0.5, maxL: 2.0, defaultL: 1.0, stepL: 0.1 },
    "Flat grasper": { group: "B", minA: 100, maxA: 250, defaultA: 100, stepA: 1, minH: 3, maxH: 15, defaultH: 3, stepH: 0.1 },
    "Grasping forceps/bipolar forceps": { group: "B", minA: 100, maxA: 250, defaultA: 100, stepA: 1, minH: 3, maxH: 15, defaultH: 3, stepH: 0.1 }
  };

  function updateESliderBackground(cfg) {
    if (!eSlider) return;
    const min = cfg.E_full[0];
    const max = cfg.E_full[1];
    const tightMin = cfg.E_tight[0];
    const tightMax = cfg.E_tight[1];
    
    const pMin = ((tightMin - min) / (max - min)) * 100;
    const pMax = ((tightMax - min) / (max - min)) * 100;
    
    eSlider.style.setProperty('--track-background', `linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMax}%, rgba(255, 255, 255, 0.15) ${pMax}%, rgba(255, 255, 255, 0.15) 100%)`);
  }

  function updateCMaterialSliderBackground(cfg) {
    if (!cMaterialSlider) return;
    const min = cfg.c_main[0];
    const max = cfg.c_main[1];
    const tightMin = cfg.c_tight[0];
    const tightMax = cfg.c_tight[1];
    
    const pMin = ((tightMin - min) / (max - min)) * 100;
    const pMax = ((tightMax - min) / (max - min)) * 100;
    
    cMaterialSlider.style.setProperty('--track-background', `linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMax}%, rgba(255, 255, 255, 0.15) ${pMax}%, rgba(255, 255, 255, 0.15) 100%)`);
  }

  function updateLSliderBackground(toolCfg) {
    if (!lSlider) return;
    const min = parseFloat(lSlider.min);
    const max = parseFloat(lSlider.max);
    const tightMin = toolCfg.minL;
    const tightMax = toolCfg.maxL;
    
    const pMin = ((tightMin - min) / (max - min)) * 100;
    const pMax = ((tightMax - min) / (max - min)) * 100;
    
    lSlider.style.setProperty('--track-background', `linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMax}%, rgba(255, 255, 255, 0.15) ${pMax}%, rgba(255, 255, 255, 0.15) 100%)`);
  }

  function updateKScale() {
    if (!tissueTypeSelect || !toolTypeSelect || !kSlider) return;
    const selectedTissue = tissueTypeSelect.value;
    const cfg = tissueConfig[selectedTissue];
    const selectedTool = toolTypeSelect.value;
    const toolCfg = toolConfig[selectedTool];
    if (!cfg || !toolCfg) return;
    
    let kMinScale = 0;
    let kMaxScale = 500;
    
    if (toolCfg.group === "A") {
      const aMin = parseFloat(contactRadiusSlider.min) / 1000;
      const aMax = parseFloat(contactRadiusSlider.max) / 1000;
      const EMin = cfg.E_full[0] * 1000;
      const EMax = cfg.E_full[1] * 1000;
      const nuMin = cfg.nu.min;
      const nuMax = cfg.nu.max;
      
      kMinScale = (2 * aMin * EMin) / (1 - nuMin * nuMin);
      kMaxScale = (2 * aMax * EMax) / (1 - nuMax * nuMax);
    } else {
      const EMin = cfg.E_full[0] * 1000;
      const EMax = cfg.E_full[1] * 1000;
      const AMin = parseFloat(jawAreaSlider.min) * 1e-6;
      const AMax = parseFloat(jawAreaSlider.max) * 1e-6;
      const hMin = parseFloat(thicknessSlider.min) / 1000;
      const hMax = parseFloat(thicknessSlider.max) / 1000;
      
      kMinScale = (EMin * AMin) / hMax;
      kMaxScale = (EMax * AMax) / hMin;
    }
    
    kSlider.min = kMinScale.toFixed(2);
    kSlider.max = kMaxScale.toFixed(2);
  }

  function updateCScale() {
    if (!tissueTypeSelect || !toolTypeSelect || !cSlider) return;
    const selectedTissue = tissueTypeSelect.value;
    const cfg = tissueConfig[selectedTissue];
    const selectedTool = toolTypeSelect.value;
    const toolCfg = toolConfig[selectedTool];
    if (!cfg || !toolCfg) return;
    
    let cMinScale = 0;
    let cMaxScale = 100;
    
    if (toolCfg.group === "A") {
      const aMin = parseFloat(contactRadiusSlider.min) / 1000;
      const aMax = parseFloat(contactRadiusSlider.max) / 1000;
      const cMin = cfg.c_main[0] * 1000;
      const cMax = cfg.c_main[1] * 1000;
      const lMin = parseFloat(lSlider.min) / 1000;
      const lMax = parseFloat(lSlider.max) / 1000;
      
      cMinScale = (cMin * Math.PI * aMin * aMin) / lMax;
      cMaxScale = (cMax * Math.PI * aMax * aMax) / lMin;
    } else {
      const cMin = cfg.c_main[0] * 1000;
      const cMax = cfg.c_main[1] * 1000;
      const AMin = parseFloat(jawAreaSlider.min) * 1e-6;
      const AMax = parseFloat(jawAreaSlider.max) * 1e-6;
      const hMin = parseFloat(thicknessSlider.min) / 1000;
      const hMax = parseFloat(thicknessSlider.max) / 1000;
      
      cMinScale = (cMin * AMin) / hMax;
      cMaxScale = (cMax * AMax) / hMin;
    }
    
    cSlider.min = cMinScale.toFixed(2);
    cSlider.max = cMaxScale.toFixed(2);
  }

  function handleTissueChange() {
    if (!tissueTypeSelect) return;
    const selected = tissueTypeSelect.value;
    const cfg = tissueConfig[selected];
    if (cfg) {
      if (nuSlider) {
        nuSlider.min = cfg.nu.min;
        nuSlider.max = cfg.nu.max;
        nuSlider.step = cfg.nu.step;
        nuSlider.value = cfg.nu.default;
        if (nuInput) {
          nuInput.min = cfg.nu.min;
          nuInput.max = cfg.nu.max;
          nuInput.step = cfg.nu.step;
          nuInput.value = cfg.nu.default;
        }
        if (nuVal) {
          nuVal.textContent = cfg.nu.default.toFixed(2);
        }
      }
      
      if (eSlider) {
        eSlider.min = cfg.E_full[0];
        eSlider.max = cfg.E_full[1];
        eSlider.step = "0.05";
        const defaultE = (cfg.E_tight[0] + cfg.E_tight[1]) / 2;
        eSlider.value = defaultE;
        if (eInput) {
          eInput.min = cfg.E_full[0];
          eInput.max = cfg.E_full[1];
          eInput.step = "0.05";
          eInput.value = defaultE;
        }
        if (eVal) {
          eVal.textContent = defaultE.toFixed(2);
        }
        updateESliderBackground(cfg);
      }

      if (cMaterialSlider) {
        cMaterialSlider.min = cfg.c_main[0];
        cMaterialSlider.max = cfg.c_main[1];
        cMaterialSlider.step = "0.1";
        const defaultCMat = (cfg.c_tight[0] + cfg.c_tight[1]) / 2;
        cMaterialSlider.value = defaultCMat;
        if (cMaterialInput) {
          cMaterialInput.min = cfg.c_main[0];
          cMaterialInput.max = cfg.c_main[1];
          cMaterialInput.step = "0.1";
          cMaterialInput.value = defaultCMat;
        }
        if (cMaterialVal) {
          cMaterialVal.textContent = defaultCMat.toFixed(1);
        }
        updateCMaterialSliderBackground(cfg);
      }

      if (eCaption) {
        eCaption.textContent = "Shaded = typical range from elastography/indentation studies; full range includes method-dependent outliers.";
      }
      const eTooltip = document.getElementById("eTooltip");
      if (eTooltip) {
        eTooltip.innerHTML = `<strong>Tissue description:</strong> ${cfg.name}<br><strong>Method priority:</strong> ${cfg.priority}`;
      }
      
      if (cMaterialTooltip) {
        cMaterialTooltip.innerHTML = `<strong>Tissue description:</strong> ${cfg.name}<br>c_material is a bulk/continuum-level material property, independent of tool geometry (expressed in kPa·s).<br><br>c_main: the full range reported across studies. c_tight: the recommended range, prioritized by method (${cfg.priority}).`;
      }
    }
    updateKScale();
    updateCScale();
    update();
  }

  function handleToolChange() {
    if (!toolTypeSelect) return;
    const selected = toolTypeSelect.value;
    const cfg = toolConfig[selected];
    if (cfg) {
      if (cfg.group === "A") {
        if (nuSliderRow) nuSliderRow.style.display = "block";
        if (groupAControls) groupAControls.style.display = "block";
        if (groupBControls) groupBControls.style.display = "none";
        
        if (contactRadiusSlider) {
          contactRadiusSlider.min = cfg.min;
          contactRadiusSlider.max = cfg.max;
          contactRadiusSlider.step = cfg.step;
          contactRadiusSlider.value = cfg.default;
        }
        if (contactRadiusInput) {
          contactRadiusInput.min = cfg.min;
          contactRadiusInput.max = cfg.max;
          contactRadiusInput.step = cfg.step;
          contactRadiusInput.value = cfg.default;
        }
        if (contactRadiusVal) {
          contactRadiusVal.textContent = cfg.default.toFixed(2);
        }
        if (contactRadiusNote) {
          contactRadiusNote.style.display = cfg.showNote ? "block" : "none";
        }

        if (lSlider) {
          lSlider.min = 0.5;
          lSlider.max = 10.0;
          lSlider.step = 0.1;
          lSlider.value = cfg.defaultL;
        }
        if (lInput) {
          lInput.min = 0.5;
          lInput.max = 10.0;
          lInput.step = 0.1;
          lInput.value = cfg.defaultL;
        }
        if (lVal) {
          lVal.textContent = cfg.defaultL.toFixed(1);
        }
        updateLSliderBackground(cfg);
      } else if (cfg.group === "B") {
        if (nuSliderRow) nuSliderRow.style.display = "none";
        if (groupAControls) groupAControls.style.display = "none";
        if (groupBControls) groupBControls.style.display = "block";
        
        if (jawAreaSlider) {
          jawAreaSlider.min = cfg.minA;
          jawAreaSlider.max = cfg.maxA;
          jawAreaSlider.step = cfg.stepA;
          jawAreaSlider.value = cfg.defaultA;
        }
        if (jawAreaInput) {
          jawAreaInput.min = cfg.minA;
          jawAreaInput.max = cfg.maxA;
          jawAreaInput.step = cfg.stepA;
          jawAreaInput.value = cfg.defaultA;
        }
        if (jawAreaVal) {
          jawAreaVal.textContent = cfg.defaultA;
        }

        if (thicknessSlider) {
          thicknessSlider.min = cfg.minH;
          thicknessSlider.max = cfg.maxH;
          thicknessSlider.step = cfg.stepH;
          thicknessSlider.value = cfg.defaultH;
        }
        if (thicknessInput) {
          thicknessInput.min = cfg.minH;
          thicknessInput.max = cfg.maxH;
          thicknessInput.step = cfg.stepH;
          thicknessInput.value = cfg.defaultH;
        }
        if (thicknessVal) {
          thicknessVal.textContent = cfg.defaultH.toFixed(1);
        }
      }
    }
    updateKScale();
    updateCScale();
    update();
  }

  const inputs = [
    { slider: kSlider, input: kInput },
    { slider: cSlider, input: cInput },
    { slider: xSlider, input: xInput },
    { slider: vSlider, input: vInput },
    { slider: nuSlider, input: nuInput },
    { slider: contactRadiusSlider, input: contactRadiusInput },
    { slider: lSlider, input: lInput },
    { slider: jawAreaSlider, input: jawAreaInput },
    { slider: thicknessSlider, input: thicknessInput },
    { slider: eSlider, input: eInput },
    { slider: cMaterialSlider, input: cMaterialInput }
  ];

  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;
    input.min = slider.min;
    input.max = slider.max;
    input.step = slider.step || "1";
  });

  let bootstrapTimeout = null;

  function runBootstrapAndUpdateUI() {
    const selectedTissue = tissueTypeSelect.value;
    const cfg = tissueConfig[selectedTissue];
    const selectedTool = toolTypeSelect.value;
    const toolCfg = toolConfig[selectedTool];
    if (!cfg || !toolCfg) return;

    // Get current values
    const currentE_kPa = parseFloat(eSlider.value);
    const currentCMat_kPa_s = parseFloat(cMaterialSlider.value);
    const currentCMat_Pa_s = currentCMat_kPa_s * 1000;
    const currentC = parseFloat(cSlider.value);
    const currentX = parseFloat(xSlider.value);
    const currentV = parseFloat(vSlider.value);
    const currentHold = parseFloat(holdSlider.value);
    const currentRampMin = parseFloat(rampMinSlider.value);
    const currentRampMax = parseFloat(rampMaxSlider.value);

    // Current deterministic k
    const E_Pa = currentE_kPa * 1000;
    let currentK = 0;
    let nu = 0;
    let a_mm = 0;
    let A_mm2 = 0;
    let h_mm = 0;

    if (toolCfg.group === "A") {
      a_mm = parseFloat(contactRadiusSlider.value);
      const a_m = a_mm / 1000;
      nu = parseFloat(nuSlider.value);
      currentK = (2 * a_m * E_Pa) / (1 - nu * nu);
    } else {
      A_mm2 = parseFloat(jawAreaSlider.value);
      const A_m2 = A_mm2 * 1e-6;
      h_mm = parseFloat(thicknessSlider.value);
      const h_m = h_mm / 1000;
      currentK = (E_Pa * A_m2) / h_m;
    }

    // Step 1: Generate synthetic noisy data using 5% relative SD
    const data = generateSyntheticData(currentK, currentC, currentX, currentV, currentHold, currentRampMin, currentRampMax);

    // Step 2 & 3: Run B=1000 bootstrap resamples using simultaneous 2x2 linear least-squares regression
    const { k_boot, c_boot } = runBootstrap(data, 1000);

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
      E_min = kMinCI * h_mm / A_mm2;
      E_max = kMaxCI * h_mm / A_mm2;
    }

    // Back-derive Damping c_material confidence interval
    let cMat_min = 0;
    let cMat_max = 0;
    if (toolCfg.group === "A") {
      const a_m = a_mm / 1000;
      const L_mm = parseFloat(lSlider.value);
      const L_m = L_mm / 1000;
      cMat_min = (cMinCI * L_m / (Math.PI * a_m * a_m)) / 1000;
      cMat_max = (cMaxCI * L_m / (Math.PI * a_m * a_m)) / 1000;
    } else {
      const A_m2 = A_mm2 * 1e-6;
      const h_m = h_mm / 1000;
      cMat_min = (cMinCI * h_m / A_m2) / 1000;
      cMat_max = (cMaxCI * h_m / A_m2) / 1000;
    }

    // Update labels
    const ciELabel = document.getElementById("ciELabel");
    const ciKLabel = document.getElementById("ciKLabel");
    const ciCMaterialLabel = document.getElementById("ciCMaterialLabel");
    const ciCLumpedLabel = document.getElementById("ciCLumpedLabel");

    const halfE = (E_max - E_min) / 2;
    if (ciELabel) {
      ciELabel.textContent = `E = ${currentE_kPa.toFixed(1)} ± ${halfE.toFixed(1)} kPa`;
    }
    if (ciKLabel) {
      ciKLabel.innerHTML = `k &approx; ${currentK.toFixed(1)} N/m (range: ${kMinCI.toFixed(1)}&ndash;${kMaxCI.toFixed(1)} N/m)`;
    }
    const halfCMat = (cMat_max - cMat_min) / 2;
    if (ciCMaterialLabel) {
      ciCMaterialLabel.textContent = `c_mat = ${currentCMat_kPa_s.toFixed(1)} ± ${halfCMat.toFixed(1)} kPa·s`;
    }
    if (ciCLumpedLabel) {
      ciCLumpedLabel.innerHTML = `c &approx; ${currentC.toFixed(2)} Ns/m (range: ${cMinCI.toFixed(2)}&ndash;${cMaxCI.toFixed(2)} Ns/m)`;
    }

    // Update bars scaled relative to bootstrap interval itself
    const ciEEl = document.getElementById("ciE");
    const ciKEl = document.getElementById("ciK");
    const ciCMaterialEl = document.getElementById("ciCMaterial");
    const ciCLumpedEl = document.getElementById("ciCLumped");

    if (ciEEl) {
      const diffE = E_max - E_min;
      const pctE = diffE > 0 ? ((currentE_kPa - E_min) / diffE) * 100 : 50;
      ciEEl.style.left = "0%";
      ciEEl.style.width = Math.min(100, Math.max(0, pctE)) + "%";
    }
    if (ciKEl) {
      const diffK = kMaxCI - kMinCI;
      const pctK = diffK > 0 ? ((currentK - kMinCI) / diffK) * 100 : 50;
      ciKEl.style.left = "0%";
      ciKEl.style.width = Math.min(100, Math.max(0, pctK)) + "%";
    }
    if (ciCMaterialEl) {
      const diffCMat = cMat_max - cMat_min;
      const pctCMat = diffCMat > 0 ? ((currentCMat_kPa_s - cMat_min) / diffCMat) * 100 : 50;
      ciCMaterialEl.style.left = "0%";
      ciCMaterialEl.style.width = Math.min(100, Math.max(0, pctCMat)) + "%";
    }
    if (ciCLumpedEl) {
      const diffCLump = cMaxCI - cMinCI;
      const pctCLump = diffCLump > 0 ? ((currentC - cMinCI) / diffCLump) * 100 : 50;
      ciCLumpedEl.style.left = "0%";
      ciCLumpedEl.style.width = Math.min(100, Math.max(0, pctCLump)) + "%";
    }

    // Update elastic/viscous decomposition ± standard deviation if Monte Carlo is ON
    let pElasticSD = 0;
    if (k_boot && c_boot) {
      const x_m = mmToM(currentX);
      const v_effective = calculateEffectiveVelocity(currentX, currentV, currentRampMin, currentRampMax);
      const v_effective_m = mmToM(v_effective);
      
      const pElastic_boot = [];
      for (let i = 0; i < k_boot.length; i++) {
        const fe = k_boot[i] * x_m;
        const fv = c_boot[i] * v_effective_m;
        const tot = fe + fv;
        pElastic_boot.push(tot > 0 ? (fe / tot) * 100 : 0);
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

    const mcToggle = document.getElementById("mcToggle");
    const mcOn = mcToggle && mcToggle.classList.contains("on");

    const elasticPct = document.getElementById("elasticPct");
    const viscousPct = document.getElementById("viscousPct");

    // Recalculate deterministic percentages for display
    const x_m = mmToM(currentX);
    const v_effective = calculateEffectiveVelocity(currentX, currentV, currentRampMin, currentRampMax);
    const v_effective_m = mmToM(v_effective);
    const fElastic = calculateElasticForce(currentK, x_m);
    const fViscous = calculateViscousForce(currentC, v_effective_m);
    const total = fElastic + fViscous;
    let pElastic = 50;
    if (total > 0) {
      pElastic = Math.round((fElastic / total) * 100);
    } else {
      pElastic = 0;
    }
    const pViscous = 100 - pElastic;

    if (mcOn) {
      if (elasticPct) elasticPct.textContent = `${pElastic}% ± ${Math.round(pElasticSD)}%`;
      if (viscousPct) viscousPct.textContent = `${pViscous}% ± ${Math.round(pElasticSD)}%`;
    } else {
      if (elasticPct) elasticPct.textContent = `${pElastic}%`;
      if (viscousPct) viscousPct.textContent = `${pViscous}%`;
    }
  }

  function getPercentiles(arr, p1 = 2.5, p2 = 97.5) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx1 = Math.floor((p1 / 100) * sorted.length);
    const idx2 = Math.floor((p2 / 100) * sorted.length);
    return [sorted[idx1], sorted[idx2]];
  }

  function update() {
    const selectedTissue = tissueTypeSelect.value;
    const cfg = tissueConfig[selectedTissue];
    const selectedTool = toolTypeSelect.value;
    const toolCfg = toolConfig[selectedTool];
    if (!cfg || !toolCfg) return;
    
    // Helper to format values cleanly and bypass floating-point rounding noise
    const fmt = (v) => parseFloat(v.toFixed(10));
    
    let k = 0;
    let kCalculationText = "";
    
    const E_kPa = parseFloat(eSlider.value);
    const E_Pa = E_kPa * 1000;
    
    if (toolCfg.group === "A") {
      const a_mm = parseFloat(contactRadiusSlider.value);
      const a_m = a_mm / 1000;
      const nu = parseFloat(nuSlider.value);
      
      const numerator = 2 * a_m * E_Pa;
      const denominator = 1 - nu * nu;
      k = numerator / denominator;
      
      kCalculationText = `Formula: k = 2aE / (1 − ν²)
k = 2 × ${fmt(a_m)} × ${E_Pa.toFixed(0)} / (1 − ${nu.toFixed(2)}²)
k = ${fmt(numerator)} / ${fmt(denominator)} ≈ ${k.toFixed(1)} N/m`;
    } else {
      const A_mm2 = parseFloat(jawAreaSlider.value);
      const A_m2 = A_mm2 * 1e-6;
      const h_mm = parseFloat(thicknessSlider.value);
      const h_m = h_mm / 1000;
      
      k = (E_Pa * A_m2) / h_m;
      
      kCalculationText = `Formula: k = E·A / h
k = ${E_Pa.toFixed(0)} × ${fmt(A_m2)} / ${fmt(h_m)} ≈ ${k.toFixed(1)} N/m`;
    }
    
    kSlider.value = k;
    if (kInput) kInput.value = k.toFixed(1);
    if (kVal) kVal.textContent = k.toFixed(1);
    
    const kMin = parseFloat(kSlider.min) || 0;
    const kMax = parseFloat(kSlider.max) || 500;
    const kPct = Math.min(100, Math.max(0, ((k - kMin) / (kMax - kMin)) * 100));
    kSlider.style.setProperty('--fill-pct', `${kPct}%`);
    
    const kCalcSteps = document.getElementById("kCalcSteps");
    if (kCalcSteps) {
      kCalcSteps.textContent = kCalculationText;
    }
    
    // c_lumped calculation based on c_material and tool geometry
    let c = 0;
    let cCalculationText = "";
    const cMaterial_kPa_s = parseFloat(cMaterialSlider.value);
    const cMaterial_Pa_s = cMaterial_kPa_s * 1000;
    
    if (toolCfg.group === "A") {
      const a_mm = parseFloat(contactRadiusSlider.value);
      const a_m = a_mm / 1000;
      const L_mm = parseFloat(lSlider.value);
      const L_m = L_mm / 1000;
      
      const numeratorC = cMaterial_Pa_s * Math.PI * a_m * a_m;
      c = numeratorC / L_m;
      
      cCalculationText = `Formula: c_lumped = c_material × π·a² / L
c_lumped = (${cMaterial_kPa_s.toFixed(1)} kPa·s × 1000) × π × ${fmt(a_m)}² / ${fmt(L_m)}
c_lumped = ${fmt(numeratorC)} / ${fmt(L_m)} ≈ ${c.toFixed(2)} Ns/m`;
    } else {
      const A_mm2 = parseFloat(jawAreaSlider.value);
      const A_m2 = A_mm2 * 1e-6;
      const h_mm = parseFloat(thicknessSlider.value);
      const h_m = h_mm / 1000;
      
      const numeratorC = cMaterial_Pa_s * A_m2;
      c = numeratorC / h_m;
      
      cCalculationText = `Formula: c_lumped = c_material × A / h
c_lumped = (${cMaterial_kPa_s.toFixed(1)} kPa·s × 1000) × ${fmt(A_m2)} / ${fmt(h_m)}
c_lumped = ${fmt(numeratorC)} / ${fmt(h_m)} ≈ ${c.toFixed(2)} Ns/m`;
    }

    cSlider.value = c;
    if (cInput) cInput.value = c.toFixed(2);
    if (cVal) cVal.textContent = c.toFixed(2);
    
    const cMin = parseFloat(cSlider.min) || 0;
    const cMax = parseFloat(cSlider.max) || 100;
    const cPct = Math.min(100, Math.max(0, ((c - cMin) / (cMax - cMin)) * 100));
    cSlider.style.setProperty('--fill-pct', `${cPct}%`);
    
    const cCalcSteps = document.getElementById("cCalcSteps");
    if (cCalcSteps) {
      cCalcSteps.textContent = cCalculationText;
    }
    
    const x = parseFloat(xSlider.value);
    const v = parseFloat(vSlider.value);
    const holdDuration = parseFloat(holdSlider.value);
    const rampMin = parseFloat(rampMinSlider.value);
    const rampMax = parseFloat(rampMaxSlider.value);
    
    xVal.textContent = x.toFixed(1);
    holdVal.textContent = holdDuration.toFixed(1);
    rampMinVal.textContent = rampMin.toFixed(2);
    rampMaxVal.textContent = rampMax.toFixed(1);

    if (xInput && document.activeElement !== xInput) xInput.value = x.toFixed(1);
    if (vInput && document.activeElement !== vInput) vInput.value = v.toFixed(1);

    // E slider sync
    if (eSlider && eVal) {
      eVal.textContent = E_kPa.toFixed(2);
      if (eInput && document.activeElement !== eInput) eInput.value = E_kPa.toFixed(2);
    }

    // c_material slider sync
    if (cMaterialSlider && cMaterialVal) {
      cMaterialVal.textContent = cMaterial_kPa_s.toFixed(1);
      if (cMaterialInput && document.activeElement !== cMaterialInput) cMaterialInput.value = cMaterial_kPa_s.toFixed(1);
    }

    // Poisson's ratio (nu) updates
    if (nuSlider && nuVal) {
      const nu = parseFloat(nuSlider.value);
      nuVal.textContent = nu.toFixed(2);
      if (nuInput && document.activeElement !== nuInput) nuInput.value = nu.toFixed(2);
    }

    // Tool contact parameter updates
    if (toolTypeSelect) {
      const selectedTool = toolTypeSelect.value;
      const cfg = toolConfig[selectedTool];
      if (cfg) {
        if (cfg.group === "A") {
          if (contactRadiusSlider && contactRadiusVal) {
            const a = parseFloat(contactRadiusSlider.value);
            contactRadiusVal.textContent = a.toFixed(2);
            if (contactRadiusInput && document.activeElement !== contactRadiusInput) {
              contactRadiusInput.value = a.toFixed(2);
            }
          }
          if (lSlider && lVal) {
            const l_val = parseFloat(lSlider.value);
            lVal.textContent = l_val.toFixed(1);
            if (lInput && document.activeElement !== lInput) {
              lInput.value = l_val.toFixed(1);
            }
          }
        } else if (cfg.group === "B") {
          if (jawAreaSlider && jawAreaVal && thicknessSlider && thicknessVal) {
            const aArea = parseFloat(jawAreaSlider.value);
            const hThickness = parseFloat(thicknessSlider.value);
            jawAreaVal.textContent = aArea.toFixed(0);
            thicknessVal.textContent = hThickness.toFixed(1);
            
            if (jawAreaInput && document.activeElement !== jawAreaInput) {
              jawAreaInput.value = aArea.toFixed(0);
            }
            if (thicknessInput && document.activeElement !== thicknessInput) {
              thicknessInput.value = hThickness.toFixed(1);
            }
          }
        }
      }
    }

    // Unit conversions using effective velocity based on dynamic clamp boundaries
    const x_m = mmToM(x);
    const v_effective = calculateEffectiveVelocity(x, v, rampMin, rampMax);
    const v_effective_m = mmToM(v_effective);

    // Update velocity slider value display to show effective velocity if clamping occurred
    if (Math.abs(v_effective - v) <= 0.01) {
      vVal.textContent = v.toFixed(1);
    } else {
      vVal.innerHTML = `${v.toFixed(1)} &rarr; <span style="color:#B06A18; font-weight:700;">${v_effective.toFixed(1)} (adjusted)</span>`;
    }

    // Decomposition (using effective velocity for consistent viscous force attribution)
    const fElastic = calculateElasticForce(k, x_m);
    const fViscous = calculateViscousForce(c, v_effective_m);
    const total = calculateTotalForce(fElastic, fViscous);
    
    let pElastic = 50;
    let pViscous = 50;
    if (total > 0) {
      pElastic = Math.round((fElastic / total) * 100);
      pViscous = 100 - pElastic;
    } else {
      pElastic = 0;
      pViscous = 0;
    }
    
    const elasticBar = document.getElementById("elasticBar");
    const viscousBar = document.getElementById("viscousBar");
    const elasticPct = document.getElementById("elasticPct");
    const viscousPct = document.getElementById("viscousPct");
    
    if (elasticBar) elasticBar.style.width = pElastic + "%";
    if (viscousBar) viscousBar.style.width = pViscous + "%";
    if (elasticPct) elasticPct.textContent = pElastic + "%";
    if (viscousPct) viscousPct.textContent = pViscous + "%";

    // Dynamic formula display
    const formulaEl = document.getElementById("dynamicFormula");
    if (formulaEl) {
      formulaEl.innerHTML = `
        <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px;">
          <div style="font-weight: 600; color: var(--navy); margin-bottom: 4px; font-size: 12px;">Viscoelastic Formula & Substitution:</div>
          <div style="margin-bottom: 4px;">General: <strong>F = k &middot; x<sub>m</sub> + c &middot; v<sub>m</sub></strong></div>
          <div style="font-family: monospace; background: #FBFCFD; border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: var(--navy); font-size: 11px;">
            F = (${k.toFixed(1)} N/m &middot; ${x_m.toFixed(4)} m) + (${c.toFixed(2)} Ns/m &middot; ${v_effective_m.toFixed(4)} m/s)<br>
            F = ${fElastic.toFixed(3)} N (Elastic) + ${fViscous.toFixed(3)} N (Viscous)<br>
            <strong>F = ${total.toFixed(3)} N</strong>
          </div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; font-style: italic;">This calculation uses your current slider values exactly (not affected by Monte Carlo).</div>
          ${Math.abs(v_effective - v) > 0.01 ? `<div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; font-style: italic;">Note: effective ẋ shown above already reflects the clamp adjustment.</div>` : ''}
        </div>
      `;
    }

    // Live rampT calculations and formula note readout update (incorporating clamp bounds)
    const rampT = calculateRampT(x, v, rampMin, rampMax);
    const rampTFormula = document.getElementById("rampTFormula");
    if (rampTFormula) {
      rampTFormula.textContent = `rampT = clamp(x/ẋ, ${rampMin.toFixed(2)}s, ${rampMax.toFixed(1)}s) = clamp(${x.toFixed(1)}/${v.toFixed(1)}, ${rampMin.toFixed(2)}s, ${rampMax.toFixed(1)}s) ≈ ${rampT.toFixed(2)} s`;
    }

    const T = 2 * rampT + holdDuration;
    const totalTFormula = document.getElementById("totalTFormula");
    if (totalTFormula) {
      totalTFormula.textContent = `T = 2 × rampT + holdDuration = 2 × ${rampT.toFixed(2)} s + ${holdDuration.toFixed(1)} s ≈ ${T.toFixed(2)} s`;
    }

    // Console verification
    console.log("fElastic:", fElastic.toFixed(4), "N, fViscous:", fViscous.toFixed(4), "N, total:", total.toFixed(4), "N");

    // Retrieve Monte Carlo state
    const mcToggle = document.getElementById("mcToggle");
    const mcOn = mcToggle && mcToggle.classList.contains("on");

    // Draw plots
    drawDepthPlot(k, x, mcOn);
    drawTimePlot(k, c, x, v, holdDuration, rampMin, rampMax, mcOn);

    // Schedule debounced bootstrap parameter updates (150ms delay)
    if (bootstrapTimeout) clearTimeout(bootstrapTimeout);
    bootstrapTimeout = setTimeout(() => {
      runBootstrapAndUpdateUI();
    }, 150);
  }

  [
    kSlider, cSlider, xSlider, vSlider, holdSlider, rampMinSlider, rampMaxSlider,
    nuSlider, contactRadiusSlider, lSlider, jawAreaSlider, thicknessSlider, eSlider, cMaterialSlider
  ].forEach(s => {
    if (s) s.addEventListener("input", update);
  });

  const mcToggle = document.getElementById("mcToggle");
  if (mcToggle) {
    mcToggle.addEventListener("click", () => {
      update();
    });
  }

  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;

    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        slider.value = val;
        update();
      }
    });

    const syncOnFinished = () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) {
        val = parseFloat(slider.value);
      }
      slider.value = val;
      input.value = slider.value;
      update();
    };

    input.addEventListener("change", syncOnFinished);
    input.addEventListener("blur", syncOnFinished);
  });

  if (tissueTypeSelect) {
    tissueTypeSelect.addEventListener("change", handleTissueChange);
  }
  if (toolTypeSelect) {
    toolTypeSelect.addEventListener("change", handleToolChange);
  }

  // Initialize tissue and tool defaults
  if (tissueTypeSelect) handleTissueChange();
  if (toolTypeSelect) handleToolChange();

  update();
  updateMonteCarloVisibility();
}

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  
  // Wire up Monte Carlo toggle click event dynamically
  const mcToggle = document.getElementById("mcToggle");
  if (mcToggle) {
    mcToggle.addEventListener("click", toggleMonteCarlo);
  }

  // Wire up parameters panel toggle click event
  const paramPanelHeader = document.getElementById("paramPanelHeader");
  const paramPanel = document.getElementById("paramPanel");
  if (paramPanelHeader && paramPanel) {
    paramPanelHeader.addEventListener("click", () => {
      paramPanel.classList.toggle("collapsed");
      const isCollapsed = paramPanel.classList.contains("collapsed");
      const label = paramPanelHeader.querySelector("span:first-child");
      if (label) {
        label.textContent = isCollapsed ? "Show material & tool parameters" : "Hide material & tool parameters";
      }
    });
  }

  // Wait for DOM to render physics panel before wiring inputs
  requestAnimationFrame(initPhysicsTab);
});
