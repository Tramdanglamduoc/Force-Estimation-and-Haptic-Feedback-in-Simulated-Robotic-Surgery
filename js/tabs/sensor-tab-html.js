export function sensorTabHTML() {
  return `
    <div class="grid-2">
      <div class="card">
        <span class="badge">Hardware Layer</span>
        <h3>Sensor & communication controls</h3>
        <p class="sub" style="margin-bottom: 20px;">Configure sensor hardware constraints and channel properties</p>
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 12px;">Sensor parameters</div>
        
        <div class="slider-row">
          <div class="label-row">
            <span>Gaussian noise &sigma; (N)</span>
            <span class="val" id="sensorNoiseVal">0.010</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorNoiseSlider" min="0" max="0.05" step="0.001" value="0.010">
            <input type="number" id="sensorNoiseInput" class="small-num-input">
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Sensor/communication latency (ms)</span>
            <span class="val" id="sensorLatencyVal">20</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorLatencySlider" min="0" max="200" step="1" value="20">
            <input type="number" id="sensorLatencyInput" class="small-num-input">
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Sampling rate (Hz)</span>
            <span class="val" id="sensorRateVal">100</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorRateSlider" min="5" max="1000" step="1" value="100">
            <input type="number" id="sensorRateInput" class="small-num-input">
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Sensor bias/offset (N)</span>
            <span class="val" id="sensorBiasVal">0.000</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorBiasSlider" min="-0.05" max="0.05" step="0.001" value="0.000">
            <input type="number" id="sensorBiasInput" class="small-num-input">
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Quantization step size (N)</span>
            <span class="val" id="sensorQuantVal">0.0010</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorQuantSlider" min="0" max="0.02" step="0.0005" value="0.0010">
            <input type="number" id="sensorQuantInput" class="small-num-input">
          </div>
          <p class="note" style="margin-top: 4px; color: var(--text-muted);">*Max constrained dynamically (F_max/5) to maintain signal legibility</p>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Saturation limit F_max (N)</span>
            <span class="val" id="sensorSatVal">0.500</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorSatSlider" min="0.005" max="1.0" step="0.001" value="0.500">
            <input type="number" id="sensorSatInput" class="small-num-input">
          </div>
          <p class="note" id="sensorSatNote" style="margin-top: 4px; color: var(--text-muted); display: none;">*F_max clamped to slider bounds</p>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Packet dropout probability (%)</span>
            <span class="val" id="sensorDropoutVal">0</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="sensorDropoutSlider" min="0" max="20" step="1" value="0">
            <input type="number" id="sensorDropoutInput" class="small-num-input">
          </div>
        </div>
      </div>

      <div>
        <div class="plots-row">
          <div class="card" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 0;">
            <h3 style="align-self: flex-start; margin-bottom: 4px;">Raw sensor signal vs. true force</h3>
            <p class="sub" style="align-self: flex-start; margin-bottom: 8px;">Simulated hardware output including latency, noise, quantization, and saturation</p>
            <span class="badge" style="background: #EDF1F3; color: var(--text-muted); align-self: flex-start; margin-bottom: 16px;">
              USES: K_EFF, C, X, Ẋ (from Physics model / Tissue structure) + &sigma;, LATENCY, SAMPLING RATE, BIAS, STEP, F_MAX, DROPOUT (local)
            </span>
            
            <canvas id="plotSensor" width="400" height="180" style="width: 100%; max-width: 400px; height: 180px;"></canvas>
            
            <div style="width: 100%; margin-top: 16px; padding: 12px; background: #FBFCFD; border: 1px solid var(--border); border-radius: 8px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 6px;">Root Mean Square Error (RMSE)</div>
              <div style="font-size: 18px; font-weight: 700; color: var(--navy);" id="sensorRmseDisplay">0.0000 N</div>
              <p class="note" style="margin-top: 6px; line-height: 1.4; color: var(--text-muted);">
                RMSE is calculated continuously over the full multi-cycle timeline comparing F_true and ZOH F_sensor.
              </p>
            </div>
            
            <p class="note" style="margin-top: 16px; line-height: 1.5; border-left: 3px solid var(--teal); padding-left: 8px; width: 100%;">
              <strong>Data Source Sync Note:</strong> True force (F_true) is read from the Physics model tab (k, c, x, ẋ) and Tissue structure tab (k_effective, if Heterogeneous tissue is ON). To change the true force curve, go back to those tabs — sliders in this tab only affect the simulated sensor signal, not the ground truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
