export function sensorTabHTML() {
  return `
    <div class="grid-3">
      <!-- COLUMN 1: Sensor & communication controls -->
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
            <input type="range" id="sensorDropoutSlider" min="0" max="100" step="1" value="0">
            <input type="number" id="sensorDropoutInput" class="small-num-input">
          </div>
        </div>
      </div>

      <!-- COLUMN 2: Raw sensor signal vs. true force chart -->
      <div>
        <div class="card" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 4px;">
            <h3 style="margin: 0;">Raw sensor signal vs. true force</h3>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button id="resetZoomBtn" class="small-btn" style="padding: 4px 8px; font-size: 10.5px; font-weight: 600; background: #fff; color: var(--navy); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;" title="Reset Zoom">Reset Zoom</button>
              <button id="expandSensorBtn" class="small-btn" style="padding: 4px 6px; font-size: 10.5px; font-weight: 600; background: #fff; color: var(--navy); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; display: flex; align-items: center;" title="Fullscreen/Expand Chart">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
              </button>
            </div>
          </div>
          <p class="sub" style="align-self: flex-start; margin-bottom: 8px;">Simulated hardware output including latency, noise, quantization, and saturation</p>
          <span class="badge" style="background: #EDF1F3; color: var(--text-muted); align-self: flex-start; margin-bottom: 16px;">
            USES: K_EFF, C, X, Ẋ (from Physics model / Tissue structure) + &sigma;, LATENCY, SAMPLING RATE, BIAS, STEP, F_MAX, DROPOUT (local)
          </span>
          
          <div class="sensor-plot-legend" style="display: flex; gap: 16px; font-size: 11px; margin-bottom: 12px; justify-content: center; width: 100%; font-family: sans-serif;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 12px; height: 3px; background-color: #1D9E75; border-radius: 1px;"></span>
              <span style="font-weight: bold; color: #1D9E75;">Ground truth F_true(t)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 12px; height: 3px; background-color: #E06666; border-radius: 1px;"></span>
              <span style="font-weight: bold; color: #E06666;">Simulated sensor F_sensor(t)</span>
            </div>
          </div>
          <canvas id="plotSensor" width="400" height="180" style="width: 100%; height: 180px;"></canvas>
          
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

      <!-- COLUMN 3: Parameter guide card -->
      <div class="card">
        <span class="badge" style="background: #EAF3EF; color: var(--teal);">Documentation</span>
        <h3>Parameter guide</h3>
        <p class="sub" style="margin-bottom: 20px;">Guide to hardware constraints</p>
        
        <div style="display: flex; flex-direction: column; gap: 16px; font-size: 12px; line-height: 1.45;">
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Gaussian noise &sigma; (N)</strong>
            <span style="color: var(--text-muted);">How much random measurement error to inject into the sensor reading. At 0, the sensor reads perfectly (no jitter).</span>
          </div>
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Sensor/communication latency (ms)</strong>
            <span style="color: var(--text-muted);">How delayed the sensor's reading is compared to the real force happening right now. At 0ms, no lag.</span>
          </div>
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Sampling rate (Hz)</strong>
            <span style="color: var(--text-muted);">How often the sensor actually takes a reading. At 5Hz (one reading every 0.2s), this is intentionally low here — that's exactly why the red line looks "steppy" instead of smooth: it's holding each reading flat until the next tick.</span>
          </div>
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Sensor bias/offset (N)</strong>
            <span style="color: var(--text-muted);">A constant, always-present reading error (like a scale that's just a bit off, every single time). At 0, no offset.</span>
          </div>
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Quantization step size (N)</strong>
            <span style="color: var(--text-muted);">The smallest force increment the sensor can actually distinguish. At 0, this feature is essentially off (no rounding to a grid).</span>
          </div>
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Saturation limit F_max (N)</strong>
            <span style="color: var(--text-muted);">The highest force value the sensor can physically report; anything above gets clipped flat. If this is set well above the real force range, saturation won't be visible in the chart.</span>
          </div>
          <div>
            <strong style="color: var(--navy); display: block; margin-bottom: 2px;">Packet dropout probability (%)</strong>
            <span style="color: var(--text-muted);">The chance that any given reading gets lost entirely (simulating a dropped wireless packet). At 0%, every reading comes through.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Fullscreen Modal Overlay for Expanded Chart -->
    <div id="sensorModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5); align-items: center; justify-content: center; padding: 20px;">
      <div style="background-color: #fff; margin: auto; padding: 24px; border: 1px solid var(--border); border-radius: 12px; width: 90%; max-width: 900px; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.15);">
        <span id="closeSensorModal" style="position: absolute; right: 20px; top: 16px; font-size: 28px; font-weight: bold; color: var(--text-muted); cursor: pointer; line-height: 1;">&times;</span>
        <h3 style="margin-top: 0; margin-bottom: 4px;">Raw sensor signal vs. true force (Expanded)</h3>
        <p class="sub" style="margin-bottom: 16px;">Scroll/pinch to zoom X-axis (Shift + scroll to zoom Y-axis), click and drag to pan.</p>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 12px;">
          <button id="resetModalZoomBtn" class="small-btn" style="padding: 6px 12px; font-size: 11px; font-weight: 600; background: #fff; color: var(--navy); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Reset zoom</button>
        </div>
        <div class="sensor-plot-legend" style="display: flex; gap: 16px; font-size: 11px; margin-bottom: 12px; justify-content: center; width: 100%; font-family: sans-serif;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 12px; height: 3px; background-color: #1D9E75; border-radius: 1px;"></span>
            <span style="font-weight: bold; color: #1D9E75;">Ground truth F_true(t)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 12px; height: 3px; background-color: #E06666; border-radius: 1px;"></span>
            <span style="font-weight: bold; color: #E06666;">Simulated sensor F_sensor(t)</span>
          </div>
        </div>
        <canvas id="plotSensorModal" width="800" height="360" style="width: 100%; height: 360px; border: 1px solid var(--border); border-radius: 8px; background: #FFF;"></canvas>
      </div>
    </div>
  `;
}
