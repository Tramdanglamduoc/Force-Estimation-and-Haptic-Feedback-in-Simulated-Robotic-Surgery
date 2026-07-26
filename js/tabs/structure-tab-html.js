export function structureTabHTML() {
  return `
    <div class="grid-2">
      <div class="card">
        <span class="badge">Anatomy & Structural Variance</span>
        <h3>Tissue structure controls</h3>
        <p class="sub">Configure localized tissue heterogeneity</p>
        
        <div class="toggle-wrap" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: rgba(0,0,0,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);">
          <span style="font-size: 13px; font-weight: 600; color: var(--navy);">Heterogeneous tissue</span>
          <div class="switch" id="heteroToggle"><div class="knob"></div></div>
        </div>
        <p class="note" style="margin-bottom: 20px;">Toggles an embedded static anatomical inclusion (vessel or tumor) inside the tissue cross-section. Unrelated to surgical instruments.</p>

        <div id="heteroControls" style="display: none;">
          <div class="slider-row">
            <div class="label-row">
              <span>Inclusion Depth (mm)</span>
              <span class="val" id="inclusionDepthVal">5.0</span>
            </div>
            <div class="input-slider-container">
              <input type="range" id="inclusionDepthSlider" min="0" max="10" step="0.1" value="5.0">
            </div>
            <p class="note" style="margin-top: 6px;">
              Distance from the surface to the inclusion. If shallow, the tool contacts it early; if deep, it may not reach it at all.
            </p>
          </div>

          <div class="slider-row" style="margin-top: 20px;">
            <div class="label-row">
              <span>Stiffness Ratio (Multiplier)</span>
              <span class="val" id="stiffnessRatioVal">1.0x</span>
            </div>
            <div class="input-slider-container">
              <input type="range" id="stiffnessRatioSlider" min="0.2" max="10.0" step="0.1" value="1.0">
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button id="presetTumor" class="small-btn" style="flex: 1; padding: 6px; font-size: 10.5px; font-weight: 600; background: #EAF3EF; color: var(--teal); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Tumor-like (stiffer)</button>
              <button id="presetVessel" class="small-btn" style="flex: 1; padding: 6px; font-size: 10.5px; font-weight: 600; background: #FDF2E4; color: #B06A18; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Vessel-like (softer)</button>
            </div>
            <p class="note" style="margin-top: 8px;">
              Presets are illustrative/approximate, NOT literature-measured values. k_inclusion = k_background × stiffness_ratio.
            </p>
          </div>
        </div>

        <div style="margin-top: 24px; padding: 12px; background: #FBFCFD; border: 1px solid var(--border); border-radius: 8px;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); margin-bottom: 6px;">Background Stiffness (k_background)</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--navy);" id="kBackgroundDisplay">0.0 N/m</div>
          <p class="note" style="margin-top: 6px; line-height: 1.4;">
            Set by [Tissue type] / [Viscoelastic model] / [Tool type] in the Physics model tab.<br>
            To change this value, go back to the Physics model tab.
          </p>
        </div>

        <!-- Collapsible Advanced Section -->
        <details style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 12px;">
          <summary style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); cursor: pointer; outline: none;">Advanced (optional)</summary>
          <div style="margin-top: 12px;">
            <div style="font-size: 11px; font-weight: 600; color: var(--navy); margin-bottom: 8px;">Temperature Mode</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="tempMode" value="normal" checked>
                Normal Patient (~37°C)
              </label>
              <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="tempMode" value="cold">
                Cold preservation (~20°C)
              </label>
              <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="radio" name="tempMode" value="hot">
                Thermal/cautery (~45°C)
              </label>
            </div>
            <p class="note" style="margin-top: 8px; line-height: 1.4;">
              Simulates special surgical contexts (donor organ preservation or electrocautery tissue damage), not casual patient body temperature variation.
            </p>
          </div>
        </details>
      </div>

      <div class="card" style="display: flex; flex-direction: column; align-items: center;">
        <h3 style="align-self: flex-start; margin-bottom: 4px;">2D cross-section diagram</h3>
        <p class="sub" style="align-self: flex-start; margin-bottom: 16px;">Live Side View of Indentation and Tissue Deformation</p>
        
        <canvas id="tissueCanvas" width="500" height="360" style="width: 100%; max-width: 500px; height: 360px;"></canvas>
        
        <div style="width: 100%; margin-top: 16px; font-family: monospace; font-size: 11px; background: #FBFCFD; border: 1px solid var(--border); padding: 10px 12px; border-radius: 8px;">
          <div style="font-weight: 700; color: var(--navy); margin-bottom: 6px;">Dynamic Stiffness & Force Readout:</div>
          <div>k_effective: <span id="kEffectiveDisplay" style="font-weight:700;">0.0</span> N/m</div>
          <div>Inclusion: <span id="kInclusionDisplay">0.0</span> N/m</div>
          <div style="margin-top: 4px; color: var(--text-muted); font-style: italic;">
            Note: Organ colors/shapes are cosmetic illustrations. Visible surface dimpling is calculated directly from current stiffness k_effective.
          </div>
        </div>
      </div>
    </div>
  `;
}
