import { runBootstrapAndUpdateUI } from './bootstrap-ci.js';
import { drawDepthPlot, drawTimePlot, drawHysteresisPlot, drawSensorPlot, calculateRampT, calculateEffectiveVelocity } from '../plots.js';
import { tissueConfig } from '../config/tissue-config.js';
import { toolConfig } from '../config/tool-config.js';
import { mmToM, calculateElasticForce, calculateViscousForce, calculateTotalForce, calculateRelaxationTime, calculateMaxwellF0, calculateMaxwellForce, calculateEffectiveStiffness } from '../physics.js';
import { updateTissueStructure } from '../tabs/tissue-structure-tab.js';

let bootstrapTimeout = null;

export function update(els) {
  const selectedTissue = els.tissueTypeSelect.value;
  const cfg = tissueConfig[selectedTissue];
  const selectedTool = els.toolTypeSelect.value;
  const toolCfg = toolConfig[selectedTool];
  if (!cfg || !toolCfg) return;
  
  // Helper to format values cleanly and bypass floating-point rounding noise
  const fmt = (v) => parseFloat(v.toFixed(10));
  
  let k = 0;
  let kCalculationText = "";
  
  const E_kPa = parseFloat(els.eSlider.value);
  const E_Pa = E_kPa * 1000;
  
  if (toolCfg.group === "A") {
    const a_mm = parseFloat(els.contactRadiusSlider.value);
    const a_m = a_mm / 1000;
    const nu = parseFloat(els.nuSlider.value);
    
    const numerator = 2 * a_m * E_Pa;
    const denominator = 1 - nu * nu;
    k = numerator / denominator;
    
    kCalculationText = `Formula: k = 2aE / (1 − ν²)
k = 2 × ${fmt(a_m)} × ${E_Pa.toFixed(0)} / (1 − ${nu.toFixed(2)}²)
k = ${fmt(numerator)} / ${fmt(denominator)} ≈ ${k.toFixed(1)} N/m`;
  } else {
    const A_mm2 = parseFloat(els.jawAreaSlider.value);
    const A_m2 = A_mm2 * 1e-6;
    const h_mm = parseFloat(els.thicknessSlider.value);
    const h_m = h_mm / 1000;
    
    k = (E_Pa * A_m2) / h_m;
    
    kCalculationText = `Formula: k = E·A / h
k = ${E_Pa.toFixed(0)} × ${fmt(A_m2)} / ${fmt(h_m)} ≈ ${k.toFixed(1)} N/m`;
  }
  
  els.kSlider.value = k;
  if (els.kInput) els.kInput.value = k.toFixed(1);
  if (els.kVal) els.kVal.textContent = k.toFixed(1);
  
  const kMin = parseFloat(els.kSlider.min) || 0;
  const kMax = parseFloat(els.kSlider.max) || 500;
  const kPct = Math.min(100, Math.max(0, ((k - kMin) / (kMax - kMin)) * 100));
  els.kSlider.style.setProperty('--fill-pct', `${kPct}%`);
  
  if (els.kCalcSteps) {
    els.kCalcSteps.textContent = kCalculationText;
  }
  
  // c_lumped calculation based on c_material and tool geometry
  let c = 0;
  let cCalculationText = "";
  const cMaterial_kPa_s = parseFloat(els.cMaterialSlider.value);
  const cMaterial_Pa_s = cMaterial_kPa_s * 1000;
  
  if (toolCfg.group === "A") {
    const a_mm = parseFloat(els.contactRadiusSlider.value);
    const a_m = a_mm / 1000;
    const L_mm = parseFloat(els.lSlider.value);
    const L_m = L_mm / 1000;
    
    const numeratorC = cMaterial_Pa_s * Math.PI * a_m * a_m;
    c = numeratorC / L_m;
    
    cCalculationText = `Formula: c_lumped = c_material × π·a² / L
c_lumped = (${cMaterial_kPa_s.toFixed(1)} kPa·s × 1000) × π × ${fmt(a_m)}² / ${fmt(L_m)}
c_lumped = ${fmt(numeratorC)} / ${fmt(L_m)} ≈ ${c.toFixed(2)} Ns/m`;
  } else {
    const A_mm2 = parseFloat(els.jawAreaSlider.value);
    const A_m2 = A_mm2 * 1e-6;
    const h_mm = parseFloat(els.thicknessSlider.value);
    const h_m = h_mm / 1000;
    
    const numeratorC = cMaterial_Pa_s * A_m2;
    c = numeratorC / h_m;
    
    cCalculationText = `Formula: c_lumped = c_material × A / h
c_lumped = (${cMaterial_kPa_s.toFixed(1)} kPa·s × 1000) × ${fmt(A_m2)} / ${fmt(h_m)}
c_lumped = ${fmt(numeratorC)} / ${fmt(h_m)} ≈ ${c.toFixed(2)} Ns/m`;
  }

  const modelType = els.modelTypeSelect ? els.modelTypeSelect.value : "Kelvin-Voigt";

  // Append caption to cCalcSteps depending on selected model role
  if (modelType === "Maxwell") {
    cCalculationText += "\nNote: c represents a series dashpot for Maxwell.";
  } else {
    cCalculationText += "\nNote: c represents a parallel dashpot for Kelvin-Voigt.";
  }

  // Update banner formula
  if (els.modelFormulaText) {
    if (modelType === "Maxwell") {
      els.modelFormulaText.innerHTML = 'Formula (ODE): Ḟ + (k/c)&middot;F = k&middot;ẋ<br><span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">Maxwell force depends on loading history, not just instantaneous x and ẋ.</span>';
    } else {
      els.modelFormulaText.innerHTML = 'Kelvin-Voigt core: F = k&middot;x + c&middot;ẋ';
    }
  }

  // Update damping slider label
  if (els.cLabelSpan) {
    if (modelType === "Maxwell") {
      els.cLabelSpan.textContent = "Damping c (series dashpot) (Ns/m)";
    } else {
      els.cLabelSpan.textContent = "Damping c (parallel dashpot) (Ns/m)";
    }
  }

  els.cSlider.value = c;
  if (els.cInput) els.cInput.value = c.toFixed(2);
  if (els.cVal) els.cVal.textContent = c.toFixed(2);
  
  const cMin = parseFloat(els.cSlider.min) || 0;
  const cMax = parseFloat(els.cSlider.max) || 100;
  const cPct = Math.min(100, Math.max(0, ((c - cMin) / (cMax - cMin)) * 100));
  els.cSlider.style.setProperty('--fill-pct', `${cPct}%`);
  
  if (els.cCalcSteps) {
    els.cCalcSteps.textContent = cCalculationText;
  }
  
  const x = parseFloat(els.xSlider.value);
  const v = parseFloat(els.vSlider.value);
  const holdDuration = parseFloat(els.holdSlider.value);
  const rampMin = parseFloat(els.rampMinSlider.value);
  const rampMax = parseFloat(els.rampMaxSlider.value);

  const isHetero = els.heteroToggle && els.heteroToggle.classList.contains("on");
  const D_inclusion = els.inclusionDepthSlider ? parseFloat(els.inclusionDepthSlider.value) : 5.0;
  const stiffness_ratio = els.stiffnessRatioSlider ? parseFloat(els.stiffnessRatioSlider.value) : 1.0;
  const kEffective = calculateEffectiveStiffness(x, k, isHetero, D_inclusion, stiffness_ratio);
  console.log("update-cycle: kEffective computed", { isHetero, k, kEffective, stiffness_ratio, D_inclusion, x });
  
  if (els.xVal) els.xVal.textContent = x.toFixed(1);
  if (els.holdVal) els.holdVal.textContent = holdDuration.toFixed(1);
  if (els.rampMinVal) els.rampMinVal.textContent = rampMin.toFixed(2);
  if (els.rampMaxVal) els.rampMaxVal.textContent = rampMax.toFixed(1);

  if (els.xInput && document.activeElement !== els.xInput) els.xInput.value = x.toFixed(1);
  if (els.vInput && document.activeElement !== els.vInput) els.vInput.value = v.toFixed(1);

  // E slider sync
  if (els.eSlider && els.eVal) {
    els.eVal.textContent = E_kPa.toFixed(2);
    if (els.eInput && document.activeElement !== els.eInput) els.eInput.value = E_kPa.toFixed(2);
  }

  // c_material slider sync
  if (els.cMaterialSlider && els.cMaterialVal) {
    els.cMaterialVal.textContent = cMaterial_kPa_s.toFixed(1);
    if (els.cMaterialInput && document.activeElement !== els.cMaterialInput) els.cMaterialInput.value = cMaterial_kPa_s.toFixed(1);
  }

  // Poisson's ratio (nu) updates
  if (els.nuSlider && els.nuVal) {
    const nu = parseFloat(els.nuSlider.value);
    els.nuVal.textContent = nu.toFixed(2);
    if (els.nuInput && document.activeElement !== els.nuInput) els.nuInput.value = nu.toFixed(2);
  }

  // Tool contact parameter updates
  if (els.toolTypeSelect) {
    const selectedTool = els.toolTypeSelect.value;
    const cfg = toolConfig[selectedTool];
    if (cfg) {
      if (cfg.group === "A") {
        if (els.contactRadiusSlider && els.contactRadiusVal) {
          const a = parseFloat(els.contactRadiusSlider.value);
          els.contactRadiusVal.textContent = a.toFixed(2);
          if (els.contactRadiusInput && document.activeElement !== els.contactRadiusInput) {
            els.contactRadiusInput.value = a.toFixed(2);
          }
        }
        if (els.lSlider && els.lVal) {
          const l_val = parseFloat(els.lSlider.value);
          els.lVal.textContent = l_val.toFixed(1);
          if (els.lInput && document.activeElement !== els.lInput) {
            els.lInput.value = l_val.toFixed(1);
          }
        }
      } else if (cfg.group === "B") {
        if (els.jawAreaSlider && els.jawAreaVal && els.thicknessSlider && els.thicknessVal) {
          const aArea = parseFloat(els.jawAreaSlider.value);
          const hThickness = parseFloat(els.thicknessSlider.value);
          els.jawAreaVal.textContent = aArea.toFixed(0);
          els.thicknessVal.textContent = hThickness.toFixed(1);
          
          if (els.jawAreaInput && document.activeElement !== els.jawAreaInput) {
            els.jawAreaInput.value = aArea.toFixed(0);
          }
          if (els.thicknessInput && document.activeElement !== els.thicknessInput) {
            els.thicknessInput.value = hThickness.toFixed(1);
          }
        }
      }
    }
  }

  // Maxwell derived values UI container
  if (els.maxwellDerivedContainer) {
    if (modelType === "Maxwell") {
      els.maxwellDerivedContainer.style.display = "";
      const tau = calculateRelaxationTime(k, c);
      if (els.tauVal) els.tauVal.textContent = tau.toFixed(3);
      if (els.tauCalcSteps) {
        els.tauCalcSteps.innerHTML = `Relaxation time constant: &tau; = c / k<br>&tau; = ${c.toFixed(2)} / ${k.toFixed(1)} &approx; ${tau.toFixed(3)} s`;
      }
      const rampT = calculateRampT(x, v, rampMin, rampMax);
      const v_m = rampT > 0 ? (x / 1000) / rampT : 0.001;
      const F0 = calculateMaxwellF0(c, v_m, rampT, tau);
      if (els.f0InfoLine) {
        els.f0InfoLine.textContent = `F₀ (at start of hold) = ${F0.toFixed(3)} N`;
      }
    } else {
      els.maxwellDerivedContainer.style.display = "none";
    }
  }

  // Unit conversions using effective velocity based on dynamic clamp boundaries
  const x_m = mmToM(x);
  const v_effective = calculateEffectiveVelocity(x, v, rampMin, rampMax);
  const v_effective_m = mmToM(v_effective);

  // Update velocity slider value display to show effective velocity if clamping occurred
  if (Math.abs(v_effective - v) <= 0.01) {
    if (els.vVal) els.vVal.textContent = v.toFixed(1);
  } else {
    if (els.vVal) els.vVal.innerHTML = `${v.toFixed(1)} &rarr; <span style="color:#B06A18; font-weight:700;">${v_effective.toFixed(1)} (adjusted)</span>`;
  }

  // Decomposition card label changes
  const decompCard = els.elasticBar ? els.elasticBar.closest('.card') : null;
  if (decompCard) {
    const h3 = decompCard.querySelector('h3');
    const subtitle = decompCard.querySelector('.sub');
    const badge = decompCard.querySelector('.badge');
    const legendSpans = decompCard.querySelectorAll('.legend span');
    
    if (modelType === "Maxwell") {
      if (h3) h3.textContent = "Strain decomposition";
      if (subtitle) subtitle.textContent = "Spring vs. dashpot deformation";
      if (badge) badge.textContent = "Uses: k, c, x";
      if (legendSpans[0]) legendSpans[0].innerHTML = '<span class="dot elastic-dot"></span>Spring — <span id="elasticPct">60%</span>';
      if (legendSpans[1]) legendSpans[1].innerHTML = '<span class="dot viscous-dot"></span>Dashpot — <span id="viscousPct">40%</span>';
    } else {
      if (h3) h3.textContent = "Force decomposition";
      if (subtitle) subtitle.textContent = "Elastic vs. viscous contribution";
      if (badge) badge.textContent = "Uses: k, c, x, ẋ";
      if (legendSpans[0]) legendSpans[0].innerHTML = '<span class="dot elastic-dot"></span>Elastic — <span id="elasticPct">60%</span>';
      if (legendSpans[1]) legendSpans[1].innerHTML = '<span class="dot viscous-dot"></span>Viscous — <span id="viscousPct">40%</span>';
    }
    // Re-bind references because innerHTML replacement detached the old elements
    els.elasticPct = document.getElementById("elasticPct");
    els.viscousPct = document.getElementById("viscousPct");
  }

  // Decomposition calculation
  let pElastic = 50;
  let pViscous = 50;
  let fElastic = 0;
  let fViscous = 0;
  let total = 0;
  let x_spring = 0;
  let x_dashpot = 0;

  if (modelType === "Maxwell") {
    const tau = calculateRelaxationTime(kEffective, c);
    const v_m = Math.max(1e-6, v_effective_m);
    const exponent = (v_m * tau) > 0 ? -x_m / (v_m * tau) : 0;
    total = c * v_m * (1 - Math.exp(exponent));
    x_spring = total / Math.max(1e-6, kEffective);
    x_dashpot = Math.max(0, x_m - x_spring);
    
    if (x_m > 0) {
      pElastic = Math.round((x_spring / x_m) * 100);
    } else {
      pElastic = 100;
    }
    pViscous = 100 - pElastic;
  } else {
    fElastic = calculateElasticForce(kEffective, x_m);
    fViscous = calculateViscousForce(c, v_effective_m);
    total = calculateTotalForce(fElastic, fViscous);
    
    if (total > 0) {
      pElastic = Math.round((fElastic / total) * 100);
      pViscous = 100 - pElastic;
    } else {
      pElastic = 0;
      pViscous = 0;
    }
  }
  
  if (els.elasticBar) els.elasticBar.style.width = pElastic + "%";
  if (els.viscousBar) els.viscousBar.style.width = pViscous + "%";
  if (els.elasticPct) els.elasticPct.textContent = pElastic + "%";
  if (els.viscousPct) els.viscousPct.textContent = pViscous + "%";

  // Dynamic formula display
  if (els.dynamicFormula) {
    if (modelType === "Maxwell") {
      els.dynamicFormula.innerHTML = `
        <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px;">
          <div style="font-weight: 600; color: var(--navy); margin-bottom: 4px; font-size: 12px;">Strain Decomposition & Substitution:</div>
          <div style="margin-bottom: 4px;">General: <strong>x<sub>spring</sub> = F / k, x<sub>dashpot</sub> = x<sub>m</sub> - x<sub>spring</sub></strong></div>
          <div style="font-family: monospace; background: #FBFCFD; border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: var(--navy); font-size: 11px;">
            F_current = ${total.toFixed(3)} N<br>
            x_spring = ${x_spring.toFixed(6)} m (${pElastic}%)<br>
            x_dashpot = ${x_dashpot.toFixed(6)} m (${pViscous}%)<br>
            <strong>x<sub>spring</sub> + x<sub>dashpot</sub> = ${(x_spring + x_dashpot).toFixed(6)} m</strong> (Total: ${x_m.toFixed(6)} m)
          </div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; font-style: italic;">This calculation uses your current slider values exactly (not affected by Monte Carlo).</div>
          ${Math.abs(v_effective - v) > 0.01 ? `<div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; font-style: italic;">Note: effective ẋ shown above already reflects the clamp adjustment.</div>` : ''}
        </div>
      `;
    } else {
      els.dynamicFormula.innerHTML = `
        <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px;">
          <div style="font-weight: 600; color: var(--navy); margin-bottom: 4px; font-size: 12px;">Viscoelastic Formula & Substitution:</div>
          <div style="margin-bottom: 4px;">General: <strong>F = k &middot; x<sub>m</sub> + c &middot; v<sub>m</sub></strong></div>
          <div style="font-family: monospace; background: #FBFCFD; border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: var(--navy); font-size: 11px;">
            F = (${kEffective.toFixed(1)} N/m &middot; ${x_m.toFixed(4)} m) + (${c.toFixed(2)} Ns/m &middot; ${v_effective_m.toFixed(4)} m/s)<br>
            F = ${fElastic.toFixed(3)} N (Elastic) + ${fViscous.toFixed(3)} N (Viscous)<br>
            <strong>F = ${total.toFixed(3)} N</strong>
          </div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; font-style: italic;">This calculation uses your current slider values exactly (not affected by Monte Carlo).</div>
          ${Math.abs(v_effective - v) > 0.01 ? `<div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; font-style: italic;">Note: effective ẋ shown above already reflects the clamp adjustment.</div>` : ''}
        </div>
      `;
    }
  }

  // Live rampT calculations and formula note readout update (incorporating clamp bounds)
  const rampT = calculateRampT(x, v, rampMin, rampMax);
  if (els.rampTFormula) {
    els.rampTFormula.textContent = `rampT = clamp(x/ẋ, ${rampMin.toFixed(2)}s, ${rampMax.toFixed(1)}s) = clamp(${x.toFixed(1)}/${v.toFixed(1)}, ${rampMin.toFixed(2)}s, ${rampMax.toFixed(1)}s) ≈ ${rampT.toFixed(2)} s`;
  }

  const T = 2 * rampT + holdDuration;
  if (els.totalTFormula) {
    els.totalTFormula.textContent = `T = 2 × rampT + holdDuration = 2 × ${rampT.toFixed(2)} s + ${holdDuration.toFixed(1)} s ≈ ${T.toFixed(2)} s`;
  }

  // Console verification
  console.log("total force:", total.toFixed(4), "N");

  // Retrieve Cyclic Loading state
  const isCyclicOn = els.cyclicToggle && els.cyclicToggle.classList.contains("on");
  const cycleCount = els.cycleCountSlider ? parseInt(els.cycleCountSlider.value) : 1;
  if (els.cycleCountVal) {
    els.cycleCountVal.textContent = cycleCount;
  }

  // Retrieve Monte Carlo state
  const mcOn = els.mcToggle && els.mcToggle.classList.contains("on");

  // Draw plots
  drawDepthPlot(k, x, mcOn, modelType, c, v_effective);
  drawTimePlot(k, c, x, v, holdDuration, rampMin, rampMax, mcOn, modelType, isCyclicOn, cycleCount);
  drawHysteresisPlot(k, c, x, v, rampMin, rampMax, mcOn);

  // Draw Tissue structure canvas
  updateTissueStructure(els, k, x, selectedTissue);

  // Compute global max peak force to set F_max dynamically
  const rampT_FMax = calculateRampT(x, v_effective, rampMin, rampMax);
  const Tc_FMax = 2 * rampT_FMax + holdDuration;
  const N_cycles_FMax = (isCyclicOn && cycleCount > 0) ? cycleCount : 1;
  const T_total_FMax = N_cycles_FMax * Tc_FMax;
  
  function xOfT_FMax(t) {
    if (t >= T_total_FMax) return 0;
    const tInCycle = t % Tc_FMax;
    if (tInCycle < rampT_FMax) return x * (tInCycle / rampT_FMax);
    if (tInCycle < Tc_FMax - rampT_FMax) return x;
    return x * Math.max(0, (Tc_FMax - tInCycle) / rampT_FMax);
  }
  function vOfT_FMax(t) {
    if (t >= T_total_FMax) return 0;
    const tInCycle = t % Tc_FMax;
    if (tInCycle < rampT_FMax) return x / rampT_FMax;
    if (tInCycle < Tc_FMax - rampT_FMax) return 0;
    if (tInCycle <= Tc_FMax) return -x / rampT_FMax;
    return 0;
  }
  function getFTrue_FMax(t) {
    const x_val = xOfT_FMax(t), v_val = vOfT_FMax(t);
    const kEff = calculateEffectiveStiffness(x_val, k, isHetero, D_inclusion, stiffness_ratio);
    if (modelType === "Maxwell") {
      const tInCycle = t % Tc_FMax;
      return calculateMaxwellForce(tInCycle, kEff, c, x, v_effective, holdDuration, rampMin, rampMax);
    } else {
      return kEff * mmToM(x_val) + c * mmToM(v_val);
    }
  }

  let peakF = 0;
  const num_eval_fmax = 100;
  for (let idx = 0; idx <= num_eval_fmax; idx++) {
    const t = (idx / num_eval_fmax) * T_total_FMax;
    const f_tr = getFTrue_FMax(t);
    if (f_tr > peakF) peakF = f_tr;
  }

  const F_max_calculated = peakF * 1.5;
  const F_max_clamped = Math.max(0.005, Math.min(1.0, F_max_calculated));
  
  const userHasModifiedFMax = els.sensorSatSlider && els.sensorSatSlider.dataset.userModified === "true";
  
  if (!userHasModifiedFMax && els.sensorSatSlider) {
    els.sensorSatSlider.value = F_max_clamped.toFixed(3);
    if (els.sensorSatInput) els.sensorSatInput.value = F_max_clamped.toFixed(3);
    
    if (els.sensorSatNote) {
      els.sensorSatNote.style.display = (F_max_calculated < 0.005 || F_max_calculated > 1.0) ? "block" : "none";
    }
  } else if (userHasModifiedFMax && els.sensorSatSlider) {
    const manualVal = parseFloat(els.sensorSatSlider.value);
    if (els.sensorSatNote) {
      els.sensorSatNote.style.display = (manualVal <= 0.005 || manualVal >= 1.0) ? "block" : "none";
    }
  }

  // Dynamic Quantization Constraint (runs on load and on update)
  if (els.sensorQuantSlider) {
    const current_F_max = parseFloat(els.sensorSatSlider.value) || 0.5;
    const q_max = Math.min(0.02, current_F_max / 5.0);
    els.sensorQuantSlider.max = q_max;
    if (els.sensorQuantInput) els.sensorQuantInput.max = q_max;
    
    let current_q_val = parseFloat(els.sensorQuantSlider.value);
    if (current_q_val > q_max) {
      els.sensorQuantSlider.value = q_max;
      if (els.sensorQuantInput) els.sensorQuantInput.value = q_max;
      current_q_val = q_max;
    }
    
    if (els.sensorQuantVal) {
      els.sensorQuantVal.textContent = current_q_val.toFixed(4);
    }
  }

  // Sync sensor slider text readouts and fills
  if (els.sensorNoiseSlider && els.sensorNoiseVal) {
    els.sensorNoiseVal.textContent = parseFloat(els.sensorNoiseSlider.value).toFixed(3);
  }
  if (els.sensorLatencySlider && els.sensorLatencyVal) {
    els.sensorLatencyVal.textContent = parseInt(els.sensorLatencySlider.value);
  }
  if (els.sensorRateSlider && els.sensorRateVal) {
    els.sensorRateVal.textContent = parseInt(els.sensorRateSlider.value);
  }
  if (els.sensorBiasSlider && els.sensorBiasVal) {
    els.sensorBiasVal.textContent = parseFloat(els.sensorBiasSlider.value).toFixed(3);
  }
  if (els.sensorSatSlider && els.sensorSatVal) {
    els.sensorSatVal.textContent = parseFloat(els.sensorSatSlider.value).toFixed(3);
  }
  if (els.sensorDropoutSlider && els.sensorDropoutVal) {
    els.sensorDropoutVal.textContent = parseInt(els.sensorDropoutSlider.value);
  }
  
  [
    els.sensorNoiseSlider, els.sensorLatencySlider, els.sensorRateSlider,
    els.sensorBiasSlider, els.sensorQuantSlider, els.sensorSatSlider,
    els.sensorDropoutSlider
  ].forEach(s => {
    if (s) {
      const min = parseFloat(s.min) || 0;
      const max = parseFloat(s.max) || 100;
      const val = parseFloat(s.value) || 0;
      const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
      s.style.setProperty('--fill-pct', `${pct}%`);
      
      const inputId = s.id.replace("Slider", "Input");
      const input = document.getElementById(inputId);
      if (input && document.activeElement !== input) {
        if (s.id.includes("Latency") || s.id.includes("Rate") || s.id.includes("Dropout")) {
          input.value = Math.round(val);
        } else if (s.id.includes("Quant")) {
          input.value = val.toFixed(4);
        } else {
          input.value = val.toFixed(3);
        }
      }
    }
  });

  // Draw plots
  drawDepthPlot(k, x, mcOn, modelType, c, v_effective);
  drawTimePlot(k, c, x, v, holdDuration, rampMin, rampMax, mcOn, modelType, isCyclicOn, cycleCount);
  drawHysteresisPlot(k, c, x, v, rampMin, rampMax, mcOn);
  
  if (els.plotSensor) {
    drawSensorPlot(kEffective, c, x, v_effective, holdDuration, rampMin, rampMax, modelType, isCyclicOn, cycleCount, els);
  }

  // Schedule debounced bootstrap parameter updates (150ms delay)
  if (bootstrapTimeout) clearTimeout(bootstrapTimeout);
  bootstrapTimeout = setTimeout(() => {
    runBootstrapAndUpdateUI(els);
  }, 150);
}
