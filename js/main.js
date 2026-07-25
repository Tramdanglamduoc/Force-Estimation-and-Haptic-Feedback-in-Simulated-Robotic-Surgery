import { initTabs } from './tabs.js';
import {
  mmToM,
  calculateElasticForce,
  calculateViscousForce,
  calculateTotalForce,
  calculateUncertainty
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

  const contactRadiusSlider = document.getElementById("contactRadiusSlider");
  const contactRadiusInput = document.getElementById("contactRadiusInput");
  const contactRadiusVal = document.getElementById("contactRadiusVal");
  const contactRadiusNote = document.getElementById("contactRadiusNote");

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
      c_full: [2.0, 10.0],
      c_tight: [2.0, 6.0],
      nu: { min: 0.30, max: 0.45, default: 0.42, step: 0.01 },
      priority: "in vivo > in situ > ex vivo"
    },
    "Kidney": {
      name: "Kidney (parenchyma, excluding capsule)",
      E_full: [1.0, 5.0],
      E_tight: [1.0, 3.0],
      c_full: [2.0, 10.0],
      c_tight: [2.0, 6.0],
      nu: { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
      priority: "in vivo > in situ > ex vivo"
    },
    "Spleen": {
      name: "Spleen (parenchyma, excluding capsule)",
      E_full: [1.0, 4.0],
      E_tight: [1.5, 3.0],
      c_full: [2.0, 8.0],
      c_tight: [2.0, 5.0],
      nu: { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
      priority: "in vivo > in situ > ex vivo"
    }
  };

  const toolConfig = {
    "Needle tip": { group: "A", min: 0.29, max: 0.65, default: 0.29, step: 0.01 },
    "Blunt palpation probe": { group: "A", min: 2.5, max: 5.0, default: 2.5, step: 0.1 },
    "Monopolar hook/spatula": { group: "A", min: 0.3, max: 0.8, default: 0.3, step: 0.01, showNote: true },
    "Suction/irrigation cannula tip": { group: "A", min: 1.5, max: 5.0, default: 1.5, step: 0.1 },
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

      if (cSlider) {
        cSlider.min = cfg.c_full[0];
        cSlider.max = cfg.c_full[1];
        cSlider.step = "0.1";
        const defaultC = (cfg.c_tight[0] + cfg.c_tight[1]) / 2;
        cSlider.value = defaultC;
        if (cInput) {
          cInput.min = cfg.c_full[0];
          cInput.max = cfg.c_full[1];
          cInput.step = "0.1";
          cInput.value = defaultC;
        }
        if (cVal) {
          cVal.textContent = defaultC.toFixed(1);
        }
      }

      if (eCaption) {
        eCaption.textContent = "Shaded = typical range from elastography/indentation studies; full range includes method-dependent outliers.";
      }
      const eTooltip = document.getElementById("eTooltip");
      if (eTooltip) {
        eTooltip.innerHTML = `<strong>Tissue description:</strong> ${cfg.name}<br><strong>Method priority:</strong> ${cfg.priority}`;
      }
    }
    updateKScale();
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
    update();
  }

  const inputs = [
    { slider: kSlider, input: kInput },
    { slider: cSlider, input: cInput },
    { slider: xSlider, input: xInput },
    { slider: vSlider, input: vInput },
    { slider: nuSlider, input: nuInput },
    { slider: contactRadiusSlider, input: contactRadiusInput },
    { slider: jawAreaSlider, input: jawAreaInput },
    { slider: thicknessSlider, input: thicknessInput },
    { slider: eSlider, input: eInput }
  ];

  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;
    input.min = slider.min;
    input.max = slider.max;
    input.step = slider.step || "1";
  });

  function update() {
    const selectedTissue = tissueTypeSelect.value;
    const cfg = tissueConfig[selectedTissue];
    const selectedTool = toolTypeSelect.value;
    const toolCfg = toolConfig[selectedTool];
    if (!cfg || !toolCfg) return;
    
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
a = ${a_mm.toFixed(2)} mm → ${a_m.toFixed(5)} m
E = ${E_kPa.toFixed(2)} kPa → ${E_Pa.toFixed(0)} Pa
ν = ${nu.toFixed(2)}
k = 2 × ${a_m.toFixed(5)} × ${E_Pa.toFixed(0)} / (1 − ${nu.toFixed(2)}²)
k = ${numerator.toFixed(4)} / ${denominator.toFixed(4)} ≈ ${k.toFixed(1)} N/m`;
    } else {
      const A_mm2 = parseFloat(jawAreaSlider.value);
      const A_m2 = A_mm2 * 1e-6;
      const h_mm = parseFloat(thicknessSlider.value);
      const h_m = h_mm / 1000;
      
      k = (E_Pa * A_m2) / h_m;
      
      kCalculationText = `Formula: k = E·A / h
E = ${E_kPa.toFixed(2)} kPa → ${E_Pa.toFixed(0)} Pa
A = ${A_mm2.toFixed(0)} mm² → ${A_m2.toString()} m²
h = ${h_mm.toFixed(1)} mm → ${h_m.toFixed(4)} m
k = ${E_Pa.toFixed(0)} × ${A_m2.toString()} / ${h_m.toFixed(4)} ≈ ${k.toFixed(1)} N/m`;
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
    
    const c = parseFloat(cSlider.value);
    const x = parseFloat(xSlider.value);
    const v = parseFloat(vSlider.value);
    const holdDuration = parseFloat(holdSlider.value);
    const rampMin = parseFloat(rampMinSlider.value);
    const rampMax = parseFloat(rampMaxSlider.value);
    
    cVal.textContent = c.toFixed(1);
    xVal.textContent = x.toFixed(1);
    holdVal.textContent = holdDuration.toFixed(1);
    rampMinVal.textContent = rampMin.toFixed(2);
    rampMaxVal.textContent = rampMax.toFixed(1);

    if (cInput && document.activeElement !== cInput) cInput.value = c;
    if (xInput && document.activeElement !== xInput) xInput.value = x.toFixed(1);
    if (vInput && document.activeElement !== vInput) vInput.value = v.toFixed(1);

    // E slider sync
    if (eSlider && eVal) {
      eVal.textContent = E_kPa.toFixed(2);
      if (eInput && document.activeElement !== eInput) eInput.value = E_kPa.toFixed(2);
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

    // Uncertainty propagation from E to k
    const { ciEWidth, ciCWidth } = calculateUncertainty(E_kPa, c);
    
    let kMinCI, kMaxCI;
    if (toolCfg.group === "A") {
      const a_m = parseFloat(contactRadiusSlider.value) / 1000;
      const nu = parseFloat(nuSlider.value);
      kMinCI = 2 * a_m * ((E_kPa - ciEWidth) * 1000) / (1 - nu * nu);
      kMaxCI = 2 * a_m * ((E_kPa + ciEWidth) * 1000) / (1 - nu * nu);
    } else {
      const A_m2 = parseFloat(jawAreaSlider.value) * 1e-6;
      const h_m = parseFloat(thicknessSlider.value) / 1000;
      kMinCI = ((E_kPa - ciEWidth) * 1000) * A_m2 / h_m;
      kMaxCI = ((E_kPa + ciEWidth) * 1000) * A_m2 / h_m;
    }
    
    const ciKLabel = document.getElementById("ciKLabel");
    const ciCLabel = document.getElementById("ciCLabel");
    if (ciKLabel) {
      ciKLabel.innerHTML = `E = ${E_kPa.toFixed(1)} &plusmn; ${ciEWidth.toFixed(1)} kPa | k &approx; ${k.toFixed(1)} N/m (range: ${kMinCI.toFixed(1)}&ndash;${kMaxCI.toFixed(1)} N/m)`;
    }
    if (ciCLabel) {
      ciCLabel.textContent = `${c.toFixed(1)} ± ${ciCWidth.toFixed(1)} Ns/m`;
    }

    // Map CI widths onto slider min/max ranges as percentages for DOM positioning
    const ciKStart = Math.max(kMin, kMinCI);
    const ciKEnd = Math.min(kMax, kMaxCI);
    const kRange = kMax - kMin;
    const ciKLeft = kRange > 0 ? ((ciKStart - kMin) / kRange) * 100 : 0;
    const ciKWidthPct = kRange > 0 ? ((ciKEnd - ciKStart) / kRange) * 100 : 0;

    const cMin = parseFloat(cSlider.min) || 0;
    const cMax = parseFloat(cSlider.max) || 50;
    const cRange = cMax - cMin;
    const ciCStart = Math.max(cMin, c - ciCWidth);
    const ciCEnd = Math.min(cMax, c + ciCWidth);
    const ciCLeft = cRange > 0 ? ((ciCStart - cMin) / cRange) * 100 : 0;
    const ciCWidthPct = cRange > 0 ? ((ciCEnd - ciCStart) / cRange) * 100 : 0;

    const ciKEl = document.getElementById("ciK");
    const ciCEl = document.getElementById("ciC");
    if (ciKEl) {
      ciKEl.style.left = ciKLeft + "%";
      ciKEl.style.width = ciKWidthPct + "%";
    }
    if (ciCEl) {
      ciCEl.style.left = ciCLeft + "%";
      ciCEl.style.width = ciCWidthPct + "%";
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
            F = (${k.toFixed(1)} N/m &middot; ${x_m.toFixed(4)} m) + (${c.toFixed(1)} Ns/m &middot; ${v_effective_m.toFixed(4)} m/s)<br>
            F = ${fElastic.toFixed(3)} N (Elastic) + ${fViscous.toFixed(3)} N (Viscous)<br>
            <strong>F = ${total.toFixed(3)} N</strong>
          </div>
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

    // Draw plots
    drawDepthPlot(k, x);
    drawTimePlot(k, c, x, v, holdDuration, rampMin, rampMax);
  }

  [
    kSlider, cSlider, xSlider, vSlider, holdSlider, rampMinSlider, rampMaxSlider,
    nuSlider, contactRadiusSlider, jawAreaSlider, thicknessSlider, eSlider
  ].forEach(s => {
    if (s) s.addEventListener("input", update);
  });

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
