/**
 * Tissue Structure Tab Controller & 2D Canvas Renderer
 */

// Interaction zone for stiffness change (arbitrary value for visual smoothness)
const D_ZONE = 2.0; 

/**
 * Initialize event wiring for the Tissue Structure tab
 */
export function initTissueStructure(els, updateFn) {
  if (!els.heteroToggle) return;

  // 1. Wiring Heterogeneous tissue toggle
  els.heteroToggle.addEventListener("click", () => {
    els.heteroToggle.classList.toggle("on");
    const isHetero = els.heteroToggle.classList.contains("on");
    if (els.heteroControls) {
      els.heteroControls.style.display = isHetero ? "block" : "none";
    }
    updateFn();
  });

  // 2. Wiring Inclusion Depth slider
  if (els.inclusionDepthSlider) {
    els.inclusionDepthSlider.addEventListener("input", () => {
      const val = parseFloat(els.inclusionDepthSlider.value);
      if (els.inclusionDepthVal) {
        els.inclusionDepthVal.textContent = val.toFixed(1) + " mm";
      }
      updateFn();
    });
  }

  // 3. Wiring Stiffness Ratio slider
  if (els.stiffnessRatioSlider) {
    els.stiffnessRatioSlider.addEventListener("input", () => {
      const val = parseFloat(els.stiffnessRatioSlider.value);
      if (els.stiffnessRatioVal) {
        els.stiffnessRatioVal.textContent = val.toFixed(1) + "x";
      }
      updateFn();
    });
  }

  // 4. Wiring Presets
  if (els.presetTumor) {
    els.presetTumor.addEventListener("click", () => {
      if (els.stiffnessRatioSlider) {
        els.stiffnessRatioSlider.value = "6.0";
        if (els.stiffnessRatioVal) els.stiffnessRatioVal.textContent = "6.0x";
      }
      updateFn();
    });
  }

  if (els.presetVessel) {
    els.presetVessel.addEventListener("click", () => {
      if (els.stiffnessRatioSlider) {
        els.stiffnessRatioSlider.value = "0.5";
        if (els.stiffnessRatioVal) els.stiffnessRatioVal.textContent = "0.5x";
      }
      updateFn();
    });
  }

  if (els.presetVeryStiff) {
    els.presetVeryStiff.addEventListener("click", () => {
      if (els.stiffnessRatioSlider) {
        els.stiffnessRatioSlider.value = "20.0";
        if (els.stiffnessRatioVal) els.stiffnessRatioVal.textContent = "20.0x";
      }
      updateFn();
    });
  }
}

/**
 * Render the Tissue structure tab cross-section diagram
 * @param {object} els DOM elements collection
 * @param {number} k_background background tissue stiffness (N/m)
 * @param {number} x_depth current indentation depth (mm)
 * @param {string} tissueType selected tissue type (Liver, Kidney, Spleen)
 */
export function updateTissueStructure(els, k_background, x_depth, tissueType) {
  const canvas = els.tissueCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, W, H);

  // Retrieve parameters
  const isHetero = els.heteroToggle && els.heteroToggle.classList.contains("on");
  const D_inclusion = els.inclusionDepthSlider ? parseFloat(els.inclusionDepthSlider.value) : 5.0;
  const stiffness_ratio = els.stiffnessRatioSlider ? parseFloat(els.stiffnessRatioSlider.value) : 1.0;
  
  // Calculate stiffnesses
  const k_inclusion = k_background * stiffness_ratio;
  
  // Calculate distance d to inclusion
  const d = Math.max(0, D_inclusion - x_depth);
  
  let k_effective = k_background;
  if (isHetero) {
    // Option B smooth cosine interpolation (default value for visual smoothness, not literature-backed)
    if (d >= D_ZONE) {
      k_effective = k_background;
    } else if (d > 0) {
      const interp = 0.5 * (1 + Math.cos((Math.PI * d) / D_ZONE));
      k_effective = k_background + (k_inclusion - k_background) * interp;
    } else {
      k_effective = k_inclusion;
    }
  }

  // Update text readouts
  if (els.kBackgroundDisplay) {
    els.kBackgroundDisplay.textContent = k_background.toFixed(1) + " N/m";
  }
  if (els.kEffectiveDisplay) {
    els.kEffectiveDisplay.textContent = k_effective.toFixed(1);
  }
  if (els.kInclusionDisplay) {
    els.kInclusionDisplay.textContent = isHetero ? k_inclusion.toFixed(1) + " N/m" : "N/A (Uniform)";
  }

  // --- 2D Drawing Configuration ---
  const surfaceY = 100;
  const tissueBottomY = 280;
  const toolTipX = W / 2;

  // Scale factors are illustrative/compressed for visual clarity, not literal mass ratios
  // (real liver:kidney:spleen mass ratio is far more extreme, ~10:1:1)
  const organScale = { Liver: 1.0, Kidney: 0.7, Spleen: 0.6 }[tissueType] || 1.0;
  
  // Depth-to-pixel conversion scales with organScale — depth values are visually
  // proportioned per-organ, not on a shared absolute mm-to-px ruler across organs.
  const indentPx = x_depth * 10 * organScale;

  // Same scaling note as indentPx: inclusion depth is relative to this organ's
  // canvas size, not directly comparable in pixels across different organs.
  const inclusionY = surfaceY + D_inclusion * 10 * organScale;

  const toolTipY = surfaceY + indentPx;

  // Scale horizontal limits for the organ drawing
  const leftX = toolTipX - 200 * organScale;
  const rightX = toolTipX + 200 * organScale;

  // Organ style settings (colors and details are cosmetic illustrations, not literature-cited)
  let fillColor = "#8B3A3A"; // Liver reddish-brown
  let strokeColor = "#5E2525";
  let organName = "Liver";

  if (tissueType === "Kidney") {
    fillColor = "#A04040"; // Kidney slightly lighter/redder brown
    strokeColor = "#6B2B2B";
    organName = "Kidney";
  } else if (tissueType === "Spleen") {
    fillColor = "#581845"; // Spleen dark purple/maroon
    strokeColor = "#3E1030";
    organName = "Spleen";
  }

  // Draw background grid/air
  ctx.fillStyle = "#F7F9FA";
  ctx.fillRect(0, 0, W, H);

  // Draw label indicating organ name
  // Font size intentionally NOT scaled by organScale — only position/anchor point
  // is adjusted, to keep labels readable across all organ sizes.
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "var(--text-muted)";
  ctx.fillText(`Organ: ${organName}`, 20, 30);

  // Draw tissue block with surface deformation
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  // Left corner
  ctx.moveTo(leftX, surfaceY);

  // Surface profile with dimpling (deformation scales inversely with k_effective)
  // Deformed depth is indentPx, but lateral transition depends on stiffness
  const dimpleWidth = Math.max(15 * organScale, Math.min(160 * organScale, 100 * organScale * Math.sqrt(k_background / k_effective)));
  
  ctx.lineTo(toolTipX - dimpleWidth, surfaceY);
  ctx.bezierCurveTo(
    toolTipX - dimpleWidth / 2, surfaceY,
    toolTipX - 0.15 * dimpleWidth, toolTipY,
    toolTipX, toolTipY
  );
  ctx.bezierCurveTo(
    toolTipX + 0.15 * dimpleWidth, toolTipY,
    toolTipX + dimpleWidth / 2, surfaceY,
    toolTipX + dimpleWidth, surfaceY
  );
  
  // Right corner
  ctx.lineTo(rightX, surfaceY);

  const scaledBottomY = surfaceY + (tissueBottomY - surfaceY) * organScale;

  // Draw organ-specific shapes
  if (tissueType === "Kidney") {
    // Bean-like lower boundary scaled relative to center (toolTipX, surfaceY)
    ctx.bezierCurveTo(
      toolTipX + (W - 20 - toolTipX) * organScale, surfaceY + (tissueBottomY - 50 - surfaceY) * organScale,
      toolTipX + (W - 150 - toolTipX) * organScale, surfaceY + (tissueBottomY + 30 - surfaceY) * organScale,
      toolTipX, scaledBottomY - 10 * organScale
    );
    ctx.bezierCurveTo(
      toolTipX + (150 - toolTipX) * organScale, surfaceY + (tissueBottomY + 30 - surfaceY) * organScale,
      toolTipX + (20 - toolTipX) * organScale, surfaceY + (tissueBottomY - 50 - surfaceY) * organScale,
      leftX, surfaceY
    );
  } else if (tissueType === "Liver") {
    // Wedge-like lower boundary scaled relative to center (toolTipX, surfaceY)
    ctx.lineTo(toolTipX + (W - 80 - toolTipX) * organScale, surfaceY + (tissueBottomY + 10 - surfaceY) * organScale);
    ctx.bezierCurveTo(
      toolTipX + 100 * organScale, surfaceY + (tissueBottomY + 20 - surfaceY) * organScale,
      toolTipX - 100 * organScale, surfaceY + (tissueBottomY - 40 - surfaceY) * organScale,
      leftX, surfaceY
    );
  } else {
    // Spleen: smooth oval boundary scaled relative to center (toolTipX, surfaceY)
    ctx.bezierCurveTo(
      toolTipX + (W - 30 - toolTipX) * organScale, surfaceY + (tissueBottomY - 40 - surfaceY) * organScale,
      toolTipX + (W - 100 - toolTipX) * organScale, surfaceY + (tissueBottomY - surfaceY) * organScale,
      toolTipX, scaledBottomY
    );
    ctx.bezierCurveTo(
      toolTipX + (100 - toolTipX) * organScale, surfaceY + (tissueBottomY - surfaceY) * organScale,
      toolTipX + (30 - toolTipX) * organScale, surfaceY + (tissueBottomY - 40 - surfaceY) * organScale,
      leftX, surfaceY
    );
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Save context and clip future drawings to the active deformed tissue path
  ctx.save();
  ctx.clip();

  // Draw Kidney internal cortex/medulla structures (cosmetic details)
  if (tissueType === "Kidney") {
    ctx.fillStyle = "rgba(107, 43, 43, 0.4)";
    for (let i = 0; i < 5; i++) {
      const cx = toolTipX + (120 + i * 65 - toolTipX) * organScale;
      const cy = surfaceY + (200 + Math.sin(i) * 20 - surfaceY) * organScale;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 20 * organScale, cy + 30 * organScale);
      ctx.lineTo(cx + 20 * organScale, cy + 30 * organScale);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Draw inclusion if heterogeneous is ON
  if (isHetero) {
    const isStiffer = stiffness_ratio > 1.0;
    
    // Position of inclusion is (toolTipX, inclusionY)
    ctx.beginPath();
    ctx.arc(toolTipX, inclusionY, 22 * organScale, 0, 2 * Math.PI);
    
    if (isStiffer) {
      // Tumor: firm bumpy gray nodule
      ctx.fillStyle = "#A9B3BA";
      ctx.strokeStyle = "#5C6B73";
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fill();
      
      // Bumpy pattern
      ctx.fillStyle = "#8FA9BB";
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const bx = toolTipX + Math.cos(angle) * 14 * organScale;
        const by = inclusionY + Math.sin(angle) * 14 * organScale;
        ctx.beginPath();
        ctx.arc(bx, by, 6 * organScale, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Vessel: red circle (artery cross-section)
      ctx.fillStyle = "#D9534F";
      ctx.strokeStyle = "#C9302C";
      ctx.fill();
      ctx.stroke();
      
      // Inner lumen/blood
      ctx.beginPath();
      ctx.arc(toolTipX, inclusionY, 14 * organScale, 0, 2 * Math.PI);
      ctx.fillStyle = "#A93226";
      ctx.fill();
    }

    // Draw inclusion label/bounds
    // Font size intentionally NOT scaled by organScale — only position/anchor point
    // is adjusted, to keep labels readable across all organ sizes.
    ctx.font = "italic 9px sans-serif";
    ctx.fillStyle = isStiffer ? "#4F5D65" : "#D9534F";
    ctx.textAlign = "center";
    ctx.fillText(isStiffer ? "Stiff tumor" : "Soft vessel", toolTipX, inclusionY - 26 * organScale);
  }

  // Restore context before drawing the tool tip/probe
  ctx.restore();

  // Draw tool tip pressing down
  ctx.strokeStyle = "#3A4E5E";
  ctx.fillStyle = "#7F8C8D";
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Draw probe handle
  ctx.moveTo(toolTipX - 6, 10);
  ctx.lineTo(toolTipX - 6, toolTipY - 12);
  ctx.lineTo(toolTipX + 6, toolTipY - 12);
  ctx.lineTo(toolTipX + 6, 10);
  ctx.stroke();
  ctx.fill();

  // Draw probe tip (spherical/blunt tip)
  ctx.fillStyle = "#34495E";
  ctx.beginPath();
  ctx.arc(toolTipX, toolTipY - 10, 10, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
}
