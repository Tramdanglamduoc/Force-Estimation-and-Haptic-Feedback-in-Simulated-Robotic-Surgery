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
  const nuNote = document.getElementById("nuNote");

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

  const tissueNuConfig = {
    "Liver": { min: 0.30, max: 0.45, default: 0.42, step: 0.01 },
    "Skin": { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
    "Muscle": { min: 0.28, max: 0.74, default: 0.47, step: 0.01, showNote: true },
    "Fat": { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
    "Kidney": { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
    "Spleen": { min: 0.47, max: 0.49, default: 0.48, step: 0.01 }
  };

  const toolConfig = {
    "Needle tip": { group: "A", min: 0.29, max: 0.65, default: 0.29, step: 0.01 },
    "Blunt palpation probe": { group: "A", min: 2.5, max: 5.0, default: 2.5, step: 0.1 },
    "Monopolar hook/spatula": { group: "A", min: 0.3, max: 0.8, default: 0.3, step: 0.01, showNote: true },
    "Suction/irrigation cannula tip": { group: "A", min: 1.5, max: 5.0, default: 1.5, step: 0.1 },
    "Flat grasper": { group: "B", minA: 100, maxA: 250, defaultA: 100, stepA: 1, minH: 3, maxH: 15, defaultH: 3, stepH: 0.1 },
    "Grasping forceps/bipolar forceps": { group: "B", minA: 100, maxA: 250, defaultA: 100, stepA: 1, minH: 3, maxH: 15, defaultH: 3, stepH: 0.1 }
  };

  function handleTissueChange() {
    if (!tissueTypeSelect || !nuSlider) return;
    const selected = tissueTypeSelect.value;
    const cfg = tissueNuConfig[selected];
    if (cfg) {
      nuSlider.min = cfg.min;
      nuSlider.max = cfg.max;
      nuSlider.step = cfg.step;
      if (nuInput) {
        nuInput.min = cfg.min;
        nuInput.max = cfg.max;
        nuInput.step = cfg.step;
      }
      
      nuSlider.value = cfg.default;
      if (nuInput) {
        nuInput.value = cfg.default;
      }
      if (nuVal) {
        nuVal.textContent = cfg.default.toFixed(2);
      }
      
      if (nuNote) {
        nuNote.style.display = cfg.showNote ? "block" : "none";
      }
    }
    update();
  }

  function handleToolChange() {
    if (!toolTypeSelect) return;
    const selected = toolTypeSelect.value;
    const cfg = toolConfig[selected];
    if (cfg) {
      if (cfg.group === "A") {
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
    { slider: thicknessSlider, input: thicknessInput }
  ];

  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;
    input.min = slider.min;
    input.max = slider.max;
    input.step = slider.step || "1";
  });

  function update() {
    const k = parseFloat(kSlider.value);
    const c = parseFloat(cSlider.value);
    const x = parseFloat(xSlider.value);
    const v = parseFloat(vSlider.value);
    const holdDuration = parseFloat(holdSlider.value);
    const rampMin = parseFloat(rampMinSlider.value);
    const rampMax = parseFloat(rampMaxSlider.value);
    
    kVal.textContent = k;
    cVal.textContent = c;
    xVal.textContent = x.toFixed(1);
    holdVal.textContent = holdDuration.toFixed(1);
    rampMinVal.textContent = rampMin.toFixed(2);
    rampMaxVal.textContent = rampMax.toFixed(1);

    if (kInput && document.activeElement !== kInput) kInput.value = k;
    if (cInput && document.activeElement !== cInput) cInput.value = c;
    if (xInput && document.activeElement !== xInput) xInput.value = x.toFixed(1);
    if (vInput && document.activeElement !== vInput) vInput.value = v.toFixed(1);

    // Poisson's ratio (nu) updates
    if (nuSlider && nuVal) {
      const nu = parseFloat(nuSlider.value);
      nuVal.textContent = nu.toFixed(2);
      if (nuInput && document.activeElement !== nuInput) nuInput.value = nu.toFixed(2);
      
      // TODO: Reserved for future k/c coupling. 
      // ν (Poisson's ratio) will be used to adjust stiffness (k) and damping (c) ranges in a future update.
      // For now, it exists as an independent, storable UI parameter only.
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

    // Uncertainty (illustrative bootstrap CI width from physics.js)
    const { ciKWidth, ciCWidth } = calculateUncertainty(k, c);
    
    const ciKLabel = document.getElementById("ciKLabel");
    const ciCLabel = document.getElementById("ciCLabel");
    if (ciKLabel) ciKLabel.textContent = `${k} ± ${ciKWidth.toFixed(1)} N/m`;
    if (ciCLabel) ciCLabel.textContent = `${c} ± ${ciCWidth.toFixed(1)} Ns/m`;

    // Map CI widths onto slider min/max ranges as percentages for DOM positioning
    const kMin = parseFloat(kSlider.min) || 10;
    const kMax = parseFloat(kSlider.max) || 500;
    const kRange = kMax - kMin;
    const ciKStart = Math.max(kMin, k - ciKWidth);
    const ciKEnd = Math.min(kMax, k + ciKWidth);
    const ciKLeft = ((ciKStart - kMin) / kRange) * 100;
    const ciKWidthPct = ((ciKEnd - ciKStart) / kRange) * 100;

    const cMin = parseFloat(cSlider.min) || 0;
    const cMax = parseFloat(cSlider.max) || 50;
    const cRange = cMax - cMin;
    const ciCStart = Math.max(cMin, c - ciCWidth);
    const ciCEnd = Math.min(cMax, c + ciCWidth);
    const ciCLeft = ((ciCStart - cMin) / cRange) * 100;
    const ciCWidthPct = ((ciCEnd - ciCStart) / cRange) * 100;

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
            F = (${k} N/m &middot; ${x_m.toFixed(4)} m) + (${c} Ns/m &middot; ${v_effective_m.toFixed(4)} m/s)<br>
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
    nuSlider, contactRadiusSlider, jawAreaSlider, thicknessSlider
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

  // Wait for DOM to render physics panel before wiring inputs
  requestAnimationFrame(initPhysicsTab);
});
