export function hapticTabHTML() {
  return `
    <div class="grid-2">
      <!-- COLUMN 1: Sonification controls -->
      <div class="card">
        <span class="badge">Feedback Layer</span>
        <h3>Haptic sonification</h3>
        <p class="sub" style="margin-bottom: 20px;">Configure audio translation of force estimates</p>
        
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 12px;">Audio parameters</div>
        
        <div class="slider-row">
          <div class="label-row" style="margin-bottom: 8px;">
            <span>Enable sound</span>
          </div>
          <div class="toggle-wrap" style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
            <span style="font-size: 12px; font-weight: 600; color: var(--navy);">Audio output</span>
            <div class="switch" id="hapticAudioToggle"><div class="knob"></div></div>
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row" style="margin-bottom: 8px;">
            <span>Audio source</span>
          </div>
          <div style="display: flex; background: rgba(0,0,0,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 2px;">
            <button id="srcGroundTruthBtn" class="toggle-btn active" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">Ground truth</button>
            <button id="srcSensorBtn" class="toggle-btn" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">Sensor</button>
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Mapping mode</span>
          </div>
          <select id="hapticMappingMode" style="width: 100%; padding: 8px 10px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: 6px; color: var(--navy); outline: none; background-color: #fff;">
            <option value="both">Pitch & Volume (Both)</option>
            <option value="pitch">Pitch only</option>
            <option value="volume">Volume only</option>
          </select>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Min frequency (Hz)</span>
            <span class="val" id="hapticMinFreqVal">150</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="hapticMinFreqSlider" min="100" max="1000" step="10" value="150">
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Max frequency (Hz)</span>
            <span class="val" id="hapticMaxFreqVal">1500</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="hapticMaxFreqSlider" min="1000" max="4000" step="50" value="1500">
          </div>
        </div>

        <div class="slider-row">
          <div class="label-row">
            <span>Master volume</span>
            <span class="val" id="hapticVolumeVal">40%</span>
          </div>
          <div class="input-slider-container">
            <input type="range" id="hapticVolumeSlider" min="0" max="100" step="1" value="40">
          </div>
        </div>
      </div>

      <!-- COLUMN 2: Playback & Gauge Panel -->
      <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 20px; min-height: 480px;">
        <h3>Force playback preview</h3>
        <p class="sub" style="margin-bottom: 20px;">Gauge and sound updates synchronized with compression cycle</p>

        <!-- Phase & Timing display -->
        <div id="hapticPhaseLabel" class="badge" style="background: #FDF2E4; color: #B06A18; font-size: 11px; padding: 6px 14px; border-radius: 20px; font-weight: 700; margin-bottom: 24px; letter-spacing: 0.04em;">PAUSED</div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 32px; margin-bottom: 28px; flex-wrap: wrap; width: 100%;">
          <!-- Gauge Widget -->
          <div style="position: relative; width: 220px; height: 180px; display: flex; justify-content: center;">
            <canvas id="gaugeCanvas" width="220" height="220" style="width: 220px; height: 220px; border: none; background: transparent;"></canvas>
          </div>

          <!-- Split Components Mini-bar -->
          <div style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; width: 180px; gap: 14px; padding: 16px; background: #FBFCFD; border: 1px solid var(--border); border-radius: 8px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); width: 100%; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 2px;">Force components</div>
            
            <div style="width: 100%;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <span style="font-weight: 600; color: var(--elastic);">Elastic F<sub>e</sub></span>
                <span id="hapticElasticVal" style="font-weight: 700; color: var(--navy);">0.000 N</span>
              </div>
              <div style="width: 100%; height: 6px; background: #EDF1F3; border-radius: 3px; overflow: hidden;">
                <div id="hapticElasticBar" style="width: 0%; height: 100%; background: var(--elastic);"></div>
              </div>
            </div>

            <div style="width: 100%;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                <span style="font-weight: 600; color: var(--viscous);">Viscous F<sub>v</sub></span>
                <span id="hapticViscousVal" style="font-weight: 700; color: var(--navy);">0.000 N</span>
              </div>
              <div style="width: 100%; height: 6px; background: #EDF1F3; border-radius: 3px; overflow: hidden;">
                <div id="hapticViscousBar" style="width: 0%; height: 100%; background: var(--viscous);"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Seeking and Control Bar -->
        <div style="width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
            <span id="hapticTimeCurrent" style="font-family: monospace; font-size: 12px; color: var(--text-muted); width: 45px; text-align: right;">0.00s</span>
            <input type="range" id="hapticScrubBar" min="0" max="1" step="0.001" value="0" style="flex: 1; accent-color: var(--teal);">
            <span id="hapticTimeTotal" style="font-family: monospace; font-size: 12px; color: var(--text-muted); width: 45px; text-align: left;">0.00s</span>
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
            <button id="hapticPlayBtn" style="padding: 10px 24px; font-size: 13px; font-weight: 700; background: var(--teal); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(15, 110, 86, 0.2); transition: all 0.15s ease;">
              <svg id="playIcon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="transition: transform 0.1s ease;"><path d="M8 5v14l11-7z"/></svg>
              <span id="playText">Play</span>
            </button>

            <div style="display: flex; background: rgba(0,0,0,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 2px;">
              <button class="speed-btn" data-speed="0.5" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s ease;">0.5x</button>
              <button class="speed-btn active" data-speed="1.0" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; background: var(--teal); color: #fff; transition: all 0.15s ease;">1x</button>
              <button class="speed-btn" data-speed="2.0" style="padding: 6px 12px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s ease;">2x</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
