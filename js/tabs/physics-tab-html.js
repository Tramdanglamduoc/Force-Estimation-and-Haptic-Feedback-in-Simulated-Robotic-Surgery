export function physicsTabHTML() {
  return `
    <div class="grid-2">
      <div class="card">
        <span class="badge">Current stage</span>
        <h3>Physics model controls</h3>
        <p class="sub" id="modelFormulaText" style="margin-bottom: 20px;">Kelvin-Voigt core: F = k&middot;x + c&middot;ẋ</p>
        
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
            <span id="cLabelSpan">Damping c (parallel dashpot) (Ns/m)</span>
            <span class="val" id="cVal">10</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="cSlider" class="locked-slider" min="2" max="10" step="0.1" value="10" disabled>
            <input type="number" id="cInput" class="small-num-input" readonly disabled style="pointer-events: none; opacity: 0.7;">
          </div>
          <div id="cCalcSteps" class="calc-steps"></div>
        </div>
        
        <div id="maxwellDerivedContainer" style="display: none; margin-top: 16px;">
          <div class="slider-row" style="margin-bottom: 8px;">
            <div class="label-row"><span>Relaxation time constant &tau; (s)</span><span class="val" id="tauVal">0.00</span></div>
            <div id="tauCalcSteps" class="calc-steps"></div>
          </div>
          <div style="font-family: monospace; font-size: 11px; color: var(--navy); background: #FBFCFD; border: 1px solid var(--border); padding: 8px 12px; border-radius: 6px; margin-top: 8px;" id="f0InfoLine">
            F₀ (at start of hold) = 0.00 N
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
            <p class="sub" id="uncertaintySubtitle" style="margin-bottom: 8px;">E, c_material confidence interval (bootstrap / least-squares); k, c_lumped shown as derived range</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: E, k, c_mat, c_lump</span>
            
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
              <div class="name">c<sub>mat</sub></div>
              <div class="ci-bar"><div class="fill" id="ciCMaterial"></div></div>
              <div id="ciCMaterialLabel" style="font-size:12px;color:var(--text-muted);white-space:nowrap;"></div>
            </div>

            <div class="ci-row">
              <div class="name">c<sub>lump</sub></div>
              <div class="ci-bar"><div class="fill" id="ciCLumped"></div></div>
              <div id="ciCLumpedLabel" style="font-size:12px;color:var(--text-muted);white-space:nowrap;"></div>
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
          </div>
        </div>
      </div>
    </div>`;
}
