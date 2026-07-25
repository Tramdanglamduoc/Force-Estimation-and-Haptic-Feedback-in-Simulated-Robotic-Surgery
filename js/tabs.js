/**
 * Tab management and view rendering logic.
 */

export const tabs = [
  { id: "physics", label: "Physics model", ready: true },
  { id: "tool", label: "Tool & contact", ready: false, items: [
    "Indentation velocity slider (0.5–50 mm/s) with slow/typical/fast presets",
    "Cyclic loading toggle + cycle-count slider — hysteresis loop + preconditioning curve",
    "Tool tip geometry dropdown (needle / flat grasper / spherical probe)",
    "Lateral/shear motion toggle — decomposes normal vs. tangential force"
  ] },
  { id: "structure", label: "Tissue structure", ready: false, items: [
    "Heterogeneous tissue toggle",
    "2D cross-section map to place an embedded vessel/tumor at chosen depth",
    "Stiffness-ratio control vs. background tissue",
    "Optional temperature slider (20–45°C), advanced/optional"
  ] },
  { id: "sensor", label: "Sensor simulation", ready: false, items: [
    "Gaussian noise standard deviation slider",
    "Sensor/communication latency slider (ms)",
    "Raw signal vs. true force vs. PINN-recovered estimate plot"
  ] },
  { id: "validation", label: "Validation", ready: false, items: [
    "PINN prediction vs. synthetic ground truth (CoppeliaSim)",
    "RMSE / R² metric cards",
    "Residual plot"
  ] },
  { id: "comparison", label: "Model comparison", ready: false, items: [
    "Ranking table: PINN vs. LSTM/MLP baseline vs. pure physics model",
    "Compared across scenarios from Tool & contact / Tissue structure tabs"
  ] },
  { id: "sensitivity", label: "Sensitivity & uncertainty", ready: false, items: [
    "Tornado chart (±5% parameter variation)",
    "Monte Carlo uncertainty decomposition",
    "PINN stage — uncertainty: MC Dropout / Deep Ensembles",
    "PINN stage — explainability: SHAP / feature attribution"
  ] },
  { id: "haptic", label: "Haptic preview", ready: false, items: [
    "Animated force-vs-time playback",
    "Synchronized needle/gauge indicator"
  ] },
  { id: "library", label: "Scenario library", ready: false, items: [
    "Save/load named presets",
    "Export current configuration + plots as PDF/report"
  ] }
];

/**
 * Switch the active tab visibility
 * @param {string} id Active tab ID
 */
export function showTab(id) {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.id === id));
  document.querySelectorAll(".tabpanel").forEach(p => p.classList.toggle("active", p.id === "panel-" + id));
  const paramPanel = document.getElementById("paramPanel");
  if (paramPanel) {
    paramPanel.style.display = (id === "physics") ? "" : "none";
  }
}

/**
 * Generate structural HTML for the Physics Model tab panel
 * @returns {string} HTML markup
 */
function physicsTabHTML() {
  return `
    <div class="grid-2">
      <div class="card">
        <span class="badge">Current stage</span>
        <h3>Physics model controls</h3>
        <p class="sub" style="margin-bottom: 20px;">Kelvin-Voigt core: F = k&middot;x + c&middot;ẋ</p>
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 12px;">Core model parameters</div>
        <div class="slider-row">
          <div class="label-row"><span>Stiffness k (N/m)</span><span class="val" id="kVal">200</span></div>
          <div class="input-slider-container">
            <input type="range" id="kSlider" class="locked-slider" min="10" max="500" value="200" disabled>
            <input type="number" id="kInput" class="small-num-input" readonly disabled style="pointer-events: none; opacity: 0.7;">
          </div>
          <div id="kCalcSteps" class="calc-steps"></div>
        </div>
        <div class="slider-row" id="cSliderRow">
          <div class="label-row">
            <span>
              Damping c (Ns/m)
              <span class="info-icon">ⓘ<span class="tooltip-text" id="cTooltip"></span></span>
            </span>
            <span class="val" id="cVal">10</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="cSlider" class="shaded-slider" min="2" max="10" step="0.1" value="10">
            <input type="number" id="cInput" class="small-num-input">
          </div>
          <div class="note" id="cCaption" style="margin-top: 6px; font-size: 11px; line-height: 1.4; border-left: 2px solid var(--teal); padding-left: 8px;">
            Shaded = typical range from elastography/indentation studies; full range includes method-dependent outliers.
          </div>
        </div>
        <div class="slider-row">
          <div class="label-row"><span>Indentation depth x (mm)</span><span class="val" id="xVal">5</span></div>
          <div class="input-slider-container">
            <input type="range" id="xSlider" min="0" max="10" step="0.1" value="5">
            <input type="number" id="xInput" class="small-num-input">
          </div>
        </div>
        <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 12px;">Time animation parameters</div>
        <div class="slider-row">
          <div class="label-row"><span>Instantaneous velocity ẋ (mm/s)</span><span class="val" id="vVal">5</span></div>
          <div class="input-slider-container">
            <input type="range" id="vSlider" min="0.1" max="50" step="0.1" value="5">
            <input type="number" id="vInput" class="small-num-input">
          </div>
        </div>
        <div class="slider-row">
          <div class="label-row"><span>Hold duration (s)</span><span class="val" id="holdVal">1.0</span></div>
          <input type="range" id="holdSlider" min="0.2" max="3" step="0.1" value="1.0">
        </div>
        <div class="slider-row">
          <div class="label-row"><span>Min ramp time (s)</span><span class="val" id="rampMinVal">0.10</span></div>
          <input type="range" id="rampMinSlider" min="0.02" max="1" step="0.01" value="0.1">
        </div>
        <div class="slider-row">
          <div class="label-row"><span>Max ramp time (s)</span><span class="val" id="rampMaxVal">1.2</span></div>
          <input type="range" id="rampMaxSlider" min="1" max="10" step="0.1" value="1.2">
        </div>
        <p class="note" style="margin-top: 10px;">These bounds keep the animation readable; they are a visualization choice, not a physically derived limit.</p>
      </div>

      <div>
        <div class="plots-row">
          <div class="card">
            <h3>Force vs. depth</h3>
            <p class="sub" style="margin-bottom: 8px;">Elastic response across indentation range</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: k, x</span>
            <canvas id="plotDepth" width="400" height="180"></canvas>
          </div>
          <div class="card">
            <h3>Force vs. time</h3>
            <p class="sub" style="margin-bottom: 8px;">One indent–hold–release cycle</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: k, c, x, ẋ, hold, ramp bounds</span>
            <canvas id="plotTime" width="400" height="180"></canvas>
            <p class="note" id="rampTFormula" style="margin-top: 10px;"></p>
            <p class="note" id="totalTFormula" style="margin-top: 4px;"></p>
          </div>
        </div>

        <div class="panels-row">
          <div class="card" id="uncertaintyPanel">
            <h3>Parameter uncertainty</h3>
            <p class="sub" id="uncertaintySubtitle" style="margin-bottom: 8px;">E, c confidence interval (bootstrap / least-squares); k shown as derived value</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: E, k, c</span>
            
            <div class="ci-row">
              <div class="name">E</div>
              <div class="ci-bar"><div class="fill" id="ciE"></div></div>
              <div id="ciELabel" style="font-size:12px;color:var(--text-muted);white-space:nowrap;"></div>
            </div>
            
            <div class="ci-row">
              <div class="name">k</div>
              <div class="ci-bar"><div class="fill" id="ciK"></div></div>
              <div id="ciKLabel" style="font-size:12px;color:var(--text-muted);white-space:nowrap;"></div>
            </div>
            
            <div class="ci-row">
              <div class="name">c</div>
              <div class="ci-bar"><div class="fill" id="ciC"></div></div>
              <div id="ciCLabel" style="font-size:12px;color:var(--text-muted);white-space:nowrap;"></div>
            </div>
            
            <p class="note" style="margin-top: 12px;">Uncertainty computed via non-parametric bootstrap (B=1000 resamples) on synthetic noisy data around the current model curve — not derived from real experimental measurements.</p>
          </div>

          <div class="card">
            <h3>Force decomposition</h3>
            <p class="sub" style="margin-bottom: 8px;">Elastic vs. viscous contribution</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: k, c, x, ẋ</span>
            <div class="stack-bar">
              <div class="elastic" id="elasticBar" style="width:60%"></div>
              <div class="viscous" id="viscousBar" style="width:40%"></div>
            </div>
            <div class="legend" style="margin-bottom: 12px;">
              <span><span class="dot elastic-dot"></span>Elastic — <span id="elasticPct">60%</span></span>
              <span><span class="dot viscous-dot"></span>Viscous — <span id="viscousPct">40%</span></span>
            </div>
            <div id="dynamicFormula"></div>
            <p class="note" style="margin-top: 12px;">Recomputes live as you move the sliders above.</p>
          </div>
        </div>
      </div>
    </div>`;
}

/**
 * Initialize tab bar buttons and corresponding panel structures in the DOM
 */
export function initTabs() {
  const tabNav = document.getElementById("tabNav");
  const tabContent = document.getElementById("tabContent");
  if (!tabNav || !tabContent) return;

  tabNav.innerHTML = "";
  tabContent.innerHTML = "";

  tabs.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.textContent = t.label;
    btn.dataset.id = t.id;
    if (i === 0) btn.classList.add("active");
    btn.onclick = () => showTab(t.id);
    tabNav.appendChild(btn);
  });

  // Build panels
  tabs.forEach(t => {
    const panel = document.createElement("div");
    panel.className = "tabpanel";
    panel.id = "panel-" + t.id;
    if (t.id === "physics") {
      panel.classList.add("active");
      panel.innerHTML = physicsTabHTML();
    } else {
      panel.innerHTML = `
        <div class="card placeholder-card">
          <span class="badge future">Coming soon</span>
          <h3>${t.label}</h3>
          <p class="sub">Planned components for this tab / sắp triển khai:</p>
          <ul>${t.items.map(x => `<li>${x}</li>`).join("")}</ul>
        </div>`;
    }
    tabContent.appendChild(panel);
  });
}
