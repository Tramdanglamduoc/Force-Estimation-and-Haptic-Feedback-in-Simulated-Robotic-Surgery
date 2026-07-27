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
              <input type="range" id="stiffnessRatioSlider" min="0.2" max="30.0" step="0.1" value="1.0">
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
              <div style="display: flex; gap: 6px;">
                <button id="presetVessel" class="small-btn" style="flex: 1; padding: 6px; font-size: 10.5px; font-weight: 600; background: #FDF2E4; color: #B06A18; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Vessel-like (softer)</button>
                <button id="presetTumor" class="small-btn" style="flex: 1; padding: 6px; font-size: 10.5px; font-weight: 600; background: #EAF3EF; color: var(--teal); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Tumor-like (stiffer)</button>
              </div>
              <button id="presetVeryStiff" class="small-btn" style="width: 100%; padding: 6px; font-size: 10.5px; font-weight: 600; background: #EDF1F3; color: var(--navy); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Very stiff/fibrotic (much stiffer)</button>
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
      </div> <!-- End of controls card -->

      <div> <!-- Start of right column container -->
        <div class="plots-row">
          <div class="card" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 0;">
            <h3 style="align-self: flex-start; margin-bottom: 4px;">2D cross-section diagram</h3>
            <p class="sub" style="align-self: flex-start; margin-bottom: 16px;">Live Side View of Indentation and Tissue Deformation</p>
            <canvas id="tissueCanvas" width="500" height="360" style="width: 100%; max-width: 500px; height: 360px;"></canvas>
          </div>
          
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 0;">
            <div>
              <h3>Dynamic Stiffness & Readout</h3>
              <p class="sub" style="margin-bottom: 16px;">Calculated stiffness of tissue layers</p>
              
              <div style="width: 100%; font-family: monospace; font-size: 11px; background: #FBFCFD; border: 1px solid var(--border); padding: 10px 12px; border-radius: 8px; line-height: 1.6;">
                <div style="font-weight: 700; color: var(--navy); margin-bottom: 6px;">Stiffness & Force:</div>
                <div style="margin-bottom: 4px;">k_effective: <span id="kEffectiveDisplay" style="font-weight:700;">0.0</span> N/m</div>
                <div>Inclusion: <span id="kInclusionDisplay">N/A (Uniform)</span></div>
              </div>
            </div>
            
            <p class="note" style="margin-top: 16px; line-height: 1.4;">
              Note: Organ colors/shapes are cosmetic illustrations. Visible surface dimpling is calculated directly from current stiffness k_effective.
              <br><br>
              *Note: Organ sizes and cross-sections are illustrative and relatively proportioned (Liver > Kidney/Spleen) for comparison, not millimeter-perfect anatomical models.*
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
