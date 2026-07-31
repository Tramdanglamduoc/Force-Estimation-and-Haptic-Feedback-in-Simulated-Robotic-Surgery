import { toolConfig } from '../config/tool-config.js';

export function initEventWiring(els, updateFn, handleTissueChangeFn, handleToolChangeFn) {
  const clampXForThickness = () => {
    if (els.thicknessSlider && els.toolTypeSelect) {
      const currentTool = els.toolTypeSelect.value;
      const cfg = toolConfig[currentTool];
      if (cfg && cfg.group === "B") {
        const hVal = parseFloat(els.thicknessSlider.value);
        const dynMaxX = Math.min(cfg.maxX, 0.6 * hVal);
        if (els.xSlider) {
          els.xSlider.max = dynMaxX;
        }
        if (els.xInput) {
          els.xInput.max = dynMaxX;
        }
        if (els.xSlider && parseFloat(els.xSlider.value) > dynMaxX) {
          els.xSlider.value = dynMaxX;
          if (els.xInput) {
            els.xInput.value = dynMaxX;
          }
          if (els.xVal) {
            els.xVal.textContent = dynMaxX;
          }
        }
      }
    }
  };

  const inputs = [
    { slider: els.kSlider, input: els.kInput },
    { slider: els.cSlider, input: els.cInput },
    { slider: els.xSlider, input: els.xInput },
    { slider: els.vSlider, input: els.vInput },
    { slider: els.nuSlider, input: els.nuInput },
    { slider: els.contactRadiusSlider, input: els.contactRadiusInput },
    { slider: els.lSlider, input: els.lInput },
    { slider: els.jawAreaSlider, input: els.jawAreaInput },
    { slider: els.thicknessSlider, input: els.thicknessInput },
    { slider: els.eSlider, input: els.eInput },
    { slider: els.cMaterialSlider, input: els.cMaterialInput },
    { slider: els.sensorNoiseSlider, input: els.sensorNoiseInput },
    { slider: els.sensorLatencySlider, input: els.sensorLatencyInput },
    { slider: els.sensorRateSlider, input: els.sensorRateInput },
    { slider: els.sensorBiasSlider, input: els.sensorBiasInput },
    { slider: els.sensorQuantSlider, input: els.sensorQuantInput },
    { slider: els.sensorSatSlider, input: els.sensorSatInput },
    { slider: els.sensorDropoutSlider, input: els.sensorDropoutInput }
  ];

  // 1. One-time initial setup bounds sync loop
  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;
    input.min = slider.min;
    input.max = slider.max;
    input.step = slider.step || "1";
  });

  // Track if user manually modified F_max
  if (els.sensorSatSlider) {
    els.sensorSatSlider.addEventListener("input", () => {
      els.sensorSatSlider.dataset.userModified = "true";
    });
  }
  if (els.sensorSatInput) {
    els.sensorSatInput.addEventListener("input", () => {
      if (els.sensorSatSlider) els.sensorSatSlider.dataset.userModified = "true";
    });
  }

  // Track if user manually modified sensorNoiseSlider
  if (els.sensorNoiseSlider) {
    els.sensorNoiseSlider.addEventListener("input", () => {
      els.sensorNoiseSlider.dataset.userModified = "true";
    });
  }
  if (els.sensorNoiseInput) {
    els.sensorNoiseInput.addEventListener("input", () => {
      if (els.sensorNoiseSlider) els.sensorNoiseSlider.dataset.userModified = "true";
    });
  }

  // Track if user manually modified sensorQuantSlider
  if (els.sensorQuantSlider) {
    els.sensorQuantSlider.addEventListener("input", () => {
      els.sensorQuantSlider.dataset.userModified = "true";
    });
  }
  if (els.sensorQuantInput) {
    els.sensorQuantInput.addEventListener("input", () => {
      if (els.sensorQuantSlider) els.sensorQuantSlider.dataset.userModified = "true";
    });
  }

  // 2. Attach standard input listeners to the sliders
  [
    els.kSlider, els.cSlider, els.xSlider, els.vSlider, els.holdSlider,
    els.rampMinSlider, els.rampMaxSlider, els.nuSlider, els.contactRadiusSlider,
    els.lSlider, els.jawAreaSlider, els.thicknessSlider, els.eSlider, els.cMaterialSlider,
    els.cycleCountSlider,
    els.sensorNoiseSlider, els.sensorLatencySlider, els.sensorRateSlider,
    els.sensorBiasSlider, els.sensorQuantSlider, els.sensorSatSlider,
    els.sensorDropoutSlider
  ].forEach(s => {
    if (s) s.addEventListener("input", updateFn);
  });

  if (els.thicknessSlider) {
    els.thicknessSlider.addEventListener("input", clampXForThickness);
  }

  // 3. Attach click listener to mcToggle to trigger recalculation/redraw
  if (els.mcToggle) {
    els.mcToggle.addEventListener("click", () => {
      updateFn();
    });
  }

  // Attach click listener to cyclicToggle
  if (els.cyclicToggle) {
    els.cyclicToggle.addEventListener("click", () => {
      els.cyclicToggle.classList.toggle("on");
      const isCyclicOn = els.cyclicToggle.classList.contains("on");
      if (els.cycleCountRow) {
        els.cycleCountRow.style.display = isCyclicOn ? "block" : "none";
      }
      updateFn();
    });
  }

  // 4. Attach numeric input sync logic
  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;

    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        slider.value = val;
        if (slider === els.thicknessSlider) {
          clampXForThickness();
        }
        updateFn();
      }
    });

    const syncOnFinished = () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) {
        val = parseFloat(slider.value);
      }
      slider.value = val;
      if (slider === els.thicknessSlider) {
        clampXForThickness();
      }
      input.value = slider.value;
      updateFn();
    };

    input.addEventListener("change", syncOnFinished);
    input.addEventListener("blur", syncOnFinished);
  });

  // 5. Attach select element change listeners
  if (els.tissueTypeSelect) {
    els.tissueTypeSelect.addEventListener("change", handleTissueChangeFn);
  }
  if (els.toolTypeSelect) {
    els.toolTypeSelect.addEventListener("change", handleToolChangeFn);
  }
  if (els.modelTypeSelect) {
    els.modelTypeSelect.addEventListener("change", updateFn);
  }
}
