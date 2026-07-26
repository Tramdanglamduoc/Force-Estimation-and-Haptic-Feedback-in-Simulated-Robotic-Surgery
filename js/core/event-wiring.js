export function initEventWiring(els, updateFn, handleTissueChangeFn, handleToolChangeFn) {
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
    { slider: els.cMaterialSlider, input: els.cMaterialInput }
  ];

  // 1. One-time initial setup bounds sync loop
  inputs.forEach(({ slider, input }) => {
    if (!slider || !input) return;
    input.min = slider.min;
    input.max = slider.max;
    input.step = slider.step || "1";
  });

  // 2. Attach standard input listeners to the 14 sliders
  [
    els.kSlider, els.cSlider, els.xSlider, els.vSlider, els.holdSlider,
    els.rampMinSlider, els.rampMaxSlider, els.nuSlider, els.contactRadiusSlider,
    els.lSlider, els.jawAreaSlider, els.thicknessSlider, els.eSlider, els.cMaterialSlider
  ].forEach(s => {
    if (s) s.addEventListener("input", updateFn);
  });

  // 3. Attach click listener to mcToggle to trigger recalculation/redraw
  if (els.mcToggle) {
    els.mcToggle.addEventListener("click", () => {
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
        updateFn();
      }
    });

    const syncOnFinished = () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) {
        val = parseFloat(slider.value);
      }
      slider.value = val;
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
}
