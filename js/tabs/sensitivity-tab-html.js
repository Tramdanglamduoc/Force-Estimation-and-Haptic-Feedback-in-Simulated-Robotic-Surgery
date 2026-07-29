export function sensitivityTabHTML() {
  return `
    <div class="grid-2">
      <!-- COLUMN 1: Sensitivity Controls -->
      <div class="card">
        <span class="badge">Analysis Layer</span>
        <h3>Sensitivity controls</h3>
        <p class="sub" style="margin-bottom: 20px;">Configure perturbation and analysis parameters</p>
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 12px;">Perturbation parameters</div>
        
        <div class="slider-row">
          <div class="label-row">
            <span>Perturbation p (±%)</span>
            <span class="val" id="perturbPctVal">5%</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="perturbPctSlider" min="1" max="20" step="1" value="5">
            <input type="number" id="perturbPctInput" class="small-num-input" min="1" max="20" step="1" value="5">
          </div>
        </div>

        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-top: 20px; margin-bottom: 12px;">Heatmap parameters</div>

        <div class="slider-row">
          <div class="label-row"><span>Parameter X</span></div>
          <select id="heatmapParamXSelect" style="width: 100%; padding: 8px 10px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: 6px; color: var(--navy); outline: none; background-color: #fff; margin-bottom: 10px;">
          </select>
        </div>

        <div class="slider-row">
          <div class="label-row"><span>Parameter Y</span></div>
          <select id="heatmapParamYSelect" style="width: 100%; padding: 8px 10px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: 6px; color: var(--navy); outline: none; background-color: #fff;">
          </select>
        </div>

        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-top: 20px; margin-bottom: 12px;">Monte Carlo convergence</div>

        <div class="slider-row">
          <div class="label-row">
            <span>Max bootstrap N</span>
            <span class="val" id="bootstrapNVal">1000</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="bootstrapNSlider" min="0" max="4" step="1" value="2">
          </div>
          <p class="note" style="margin-top: 4px; color: var(--text-muted);">Snapped to: [100, 500, 1000, 2000, 5000]</p>
        </div>

        <button id="recomputeConvergenceBtn" style="width: 100%; padding: 10px 16px; font-size: 12px; font-weight: 700; background: var(--teal); color: #fff; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 2px 6px rgba(15, 110, 86, 0.15);">
          Recompute convergence
        </button>

        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-top: 24px; margin-bottom: 12px;">Cross-tissue comparison</div>

        <div class="slider-row">
          <div class="label-row"><span>Target tissues</span></div>
          <div id="compareTissueChecks" style="display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--navy); font-weight: 600; cursor: pointer;">
              <input type="checkbox" value="Liver" checked style="accent-color: var(--teal);"> Liver
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--navy); font-weight: 600; cursor: pointer;">
              <input type="checkbox" value="Kidney" checked style="accent-color: var(--teal);"> Kidney
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--navy); font-weight: 600; cursor: pointer;">
              <input type="checkbox" value="Spleen" checked style="accent-color: var(--teal);"> Spleen
            </label>
          </div>
        </div>
      </div>

      <!-- COLUMN 2: Analysis Displays -->
      <div>
        <div class="plots-row" style="grid-template-columns: 1fr; margin-bottom: 16px;">
          <!-- 1. Tornado Chart -->
          <div class="card">
            <h3>Tornado chart (±p% parameter variation)</h3>
            <p class="sub" style="margin-bottom: 8px;">Peak force sensitivity to individual parameter variation</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: One-at-a-time (OAT) perturbation</span>
            <canvas id="plotTornado" width="600" height="200" style="height: 200px;"></canvas>
          </div>
        </div>

        <div class="plots-row" style="margin-bottom: 16px;">
          <!-- 2. MC Uncertainty Decomposition -->
          <div class="card" id="sobolDecompContainer" style="display: flex; flex-direction: column;">
            <h3>Monte Carlo uncertainty decomposition</h3>
            <p class="sub" style="margin-bottom: 8px;">Decomposition uses k, c_lumped from existing bootstrap cache</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: window.bootstrapCache</span>
            <div id="sobolContent" style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 180px;">
              <!-- Dynamic output goes here -->
            </div>
          </div>

          <!-- 3. Parameter interaction heatmap -->
          <div class="card">
            <h3>Parameter correlation / interaction heatmap</h3>
            <p class="sub" style="margin-bottom: 8px;">Force sensitivity surface across joint variations (clamped bounds)</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: 15x15 force grid</span>
            <canvas id="plotHeatmap" width="300" height="180"></canvas>
          </div>
        </div>

        <div class="plots-row" style="margin-bottom: 16px;">
          <!-- 4. MC Convergence -->
          <div class="card">
            <h3>MC convergence / stability check</h3>
            <p class="sub" style="margin-bottom: 8px;">95% confidence interval width as a function of bootstrap sample size N</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: runBootstrap()</span>
            <canvas id="plotConvergence" width="300" height="180"></canvas>
          </div>

          <!-- 5. Ranking Table -->
          <div class="card">
            <h3>Parameter ranking table</h3>
            <p class="sub" style="margin-bottom: 16px;">Sorted list of parameter sensitivity and variance attribution</p>
            <div id="rankingTableContainer" style="overflow-x: auto; font-size: 11px;">
              <!-- HTML Table injected here -->
            </div>
          </div>
        </div>

        <div class="plots-row" style="grid-template-columns: 1fr; margin-bottom: 0;">
          <!-- 6. Cross-tissue comparison -->
          <div class="card">
            <h3>Cross-tissue sensitivity comparison</h3>
            <p class="sub" style="margin-bottom: 8px;">Grouped parameter swings compared across default organ baselines</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); margin-bottom: 16px;">Uses: tissueConfig baselines + perturbPct</span>
            <canvas id="plotComparison" width="600" height="200" style="height: 200px;"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
}
