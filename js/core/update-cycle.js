import { runBootstrapAndUpdateUI } from './bootstrap-ci.js';
import { drawDepthPlot, drawTimePlot, calculateRampT, calculateEffectiveVelocity } from '../plots.js';
import { tissueConfig } from '../config/tissue-config.js';
import { toolConfig } from '../config/tool-config.js';
import { mmToM, calculateElasticForce, calculateViscousForce, calculateTotalForce } from '../physics.js';

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
  
  if (els.elasticBar) els.elasticBar.style.width = pElastic + "%";
  if (els.viscousBar) els.viscousBar.style.width = pViscous + "%";
  if (els.elasticPct) els.elasticPct.textContent = pElastic + "%";
  if (els.viscousPct) els.viscousPct.textContent = pViscous + "%";

  // Dynamic formula display
  if (els.dynamicFormula) {
    els.dynamicFormula.innerHTML = `
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
  if (els.rampTFormula) {
    els.rampTFormula.textContent = `rampT = clamp(x/ẋ, ${rampMin.toFixed(2)}s, ${rampMax.toFixed(1)}s) = clamp(${x.toFixed(1)}/${v.toFixed(1)}, ${rampMin.toFixed(2)}s, ${rampMax.toFixed(1)}s) ≈ ${rampT.toFixed(2)} s`;
  }

  const T = 2 * rampT + holdDuration;
  if (els.totalTFormula) {
    els.totalTFormula.textContent = `T = 2 × rampT + holdDuration = 2 × ${rampT.toFixed(2)} s + ${holdDuration.toFixed(1)} s ≈ ${T.toFixed(2)} s`;
  }

  // Console verification
  console.log("fElastic:", fElastic.toFixed(4), "N, fViscous:", fViscous.toFixed(4), "N, total:", total.toFixed(4), "N");

  // Retrieve Monte Carlo state
  const mcOn = els.mcToggle && els.mcToggle.classList.contains("on");

  // Draw plots
  drawDepthPlot(k, x, mcOn);
  drawTimePlot(k, c, x, v, holdDuration, rampMin, rampMax, mcOn);

  // Schedule debounced bootstrap parameter updates (150ms delay)
  if (bootstrapTimeout) clearTimeout(bootstrapTimeout);
  bootstrapTimeout = setTimeout(() => {
    runBootstrapAndUpdateUI(els);
  }, 150);
}
