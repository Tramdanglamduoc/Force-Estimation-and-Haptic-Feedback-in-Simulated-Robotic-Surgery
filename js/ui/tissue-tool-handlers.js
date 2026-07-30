import { tissueConfig } from '../config/tissue-config.js';
import { toolConfig } from '../config/tool-config.js';
import {
  updateESliderBackground,
  updateCMaterialSliderBackground,
  updateLSliderBackground,
  updateKScale,
  updateCScale
} from './slider-visuals.js';

export function handleTissueChange(els, updateFn) {
  if (!els.tissueTypeSelect) return;
  const selected = els.tissueTypeSelect.value;
  const cfg = tissueConfig[selected];
  if (cfg) {
    if (els.nuSlider) {
      els.nuSlider.min = cfg.nu.min;
      els.nuSlider.max = cfg.nu.max;
      els.nuSlider.step = cfg.nu.step;
      els.nuSlider.value = cfg.nu.default;
      if (els.nuInput) {
        els.nuInput.min = cfg.nu.min;
        els.nuInput.max = cfg.nu.max;
        els.nuInput.step = cfg.nu.step;
        els.nuInput.value = cfg.nu.default;
      }
      if (els.nuVal) {
        els.nuVal.textContent = cfg.nu.default.toFixed(2);
      }
    }
    
    if (els.eSlider) {
      els.eSlider.min = cfg.E_full[0];
      els.eSlider.max = cfg.E_full[1];
      els.eSlider.step = "0.05";
      const defaultE = (cfg.E_tight[0] + cfg.E_tight[1]) / 2;
      els.eSlider.value = defaultE;
      if (els.eInput) {
        els.eInput.min = cfg.E_full[0];
        els.eInput.max = cfg.E_full[1];
        els.eInput.step = "0.05";
        els.eInput.value = defaultE;
      }
      if (els.eVal) {
        els.eVal.textContent = defaultE.toFixed(2);
      }
      updateESliderBackground(els, cfg);
    }

    if (els.cMaterialSlider) {
      els.cMaterialSlider.min = cfg.c_main[0];
      els.cMaterialSlider.max = cfg.c_main[1];
      els.cMaterialSlider.step = "0.1";
      const defaultCMat = (cfg.c_tight[0] + cfg.c_tight[1]) / 2;
      els.cMaterialSlider.value = defaultCMat;
      if (els.cMaterialInput) {
        els.cMaterialInput.min = cfg.c_main[0];
        els.cMaterialInput.max = cfg.c_main[1];
        els.cMaterialInput.step = "0.1";
        els.cMaterialInput.value = defaultCMat;
      }
      if (els.cMaterialVal) {
        els.cMaterialVal.textContent = defaultCMat.toFixed(1);
      }
      updateCMaterialSliderBackground(els, cfg);
    }

    if (els.eCaption) {
      els.eCaption.textContent = "Shaded = typical range from elastography/indentation studies; full range includes method-dependent outliers.";
    }
    const eTooltip = document.getElementById("eTooltip");
    if (eTooltip) {
      eTooltip.innerHTML = `<strong>Tissue description:</strong> ${cfg.name}<br><strong>Method priority:</strong> ${cfg.priority}`;
    }
    
    if (els.cMaterialTooltip) {
      els.cMaterialTooltip.innerHTML = `<strong>Tissue description:</strong> ${cfg.name}<br>c_material is a bulk/continuum-level material property, independent of tool geometry (expressed in kPa·s).<br><br>c_main: the full range reported across studies. c_tight: the recommended range, prioritized by method (${cfg.priority}).`;
    }
  }
  updateKScale(els);
  updateCScale(els);
  updateFn();
}

export function handleToolChange(els, updateFn) {
  if (!els.toolTypeSelect) return;
  const selected = els.toolTypeSelect.value;
  const cfg = toolConfig[selected];
  if (cfg) {
    if (cfg.group === "A") {
      if (els.nuSliderRow) els.nuSliderRow.style.display = "block";
      if (els.groupAControls) els.groupAControls.style.display = "block";
      if (els.groupBControls) els.groupBControls.style.display = "none";
      
      if (els.contactRadiusSlider) {
        els.contactRadiusSlider.min = cfg.min;
        els.contactRadiusSlider.max = cfg.max;
        els.contactRadiusSlider.step = cfg.step;
        els.contactRadiusSlider.value = cfg.default;
      }
      if (els.contactRadiusInput) {
        els.contactRadiusInput.min = cfg.min;
        els.contactRadiusInput.max = cfg.max;
        els.contactRadiusInput.step = cfg.step;
        els.contactRadiusInput.value = cfg.default;
      }
      if (els.contactRadiusVal) {
        els.contactRadiusVal.textContent = cfg.default.toFixed(2);
      }
      if (els.contactRadiusNote) {
        els.contactRadiusNote.style.display = cfg.showNote ? "block" : "none";
      }

      if (els.lSlider) {
        els.lSlider.min = 0.5;
        els.lSlider.max = 10.0;
        els.lSlider.step = 0.1;
        els.lSlider.value = cfg.defaultL;
      }
      if (els.lInput) {
        els.lInput.min = 0.5;
        els.lInput.max = 10.0;
        els.lInput.step = 0.1;
        els.lInput.value = cfg.defaultL;
      }
      if (els.lVal) {
        els.lVal.textContent = cfg.defaultL.toFixed(1);
      }
      updateLSliderBackground(els, cfg);
    } else if (cfg.group === "B") {
      if (els.nuSliderRow) els.nuSliderRow.style.display = "block";
      if (els.groupAControls) els.groupAControls.style.display = "none";
      if (els.groupBControls) els.groupBControls.style.display = "block";
      
      if (els.jawAreaSlider) {
        els.jawAreaSlider.min = cfg.minA;
        els.jawAreaSlider.max = cfg.maxA;
        els.jawAreaSlider.step = cfg.stepA;
        els.jawAreaSlider.value = cfg.defaultA;
      }
      if (els.jawAreaInput) {
        els.jawAreaInput.min = cfg.minA;
        els.jawAreaInput.max = cfg.maxA;
        els.jawAreaInput.step = cfg.stepA;
        els.jawAreaInput.value = cfg.defaultA;
      }
      if (els.jawAreaVal) {
        els.jawAreaVal.textContent = cfg.defaultA;
      }

      if (els.thicknessSlider) {
        els.thicknessSlider.min = cfg.minH;
        els.thicknessSlider.max = cfg.maxH;
        els.thicknessSlider.step = cfg.stepH;
        els.thicknessSlider.value = cfg.defaultH;
      }
      if (els.thicknessInput) {
        els.thicknessInput.min = cfg.minH;
        els.thicknessInput.max = cfg.maxH;
        els.thicknessInput.step = cfg.stepH;
        els.thicknessInput.value = cfg.defaultH;
      }
      if (els.thicknessVal) {
        els.thicknessVal.textContent = cfg.defaultH.toFixed(1);
      }
    }

    if (els.xSlider) {
      els.xSlider.min = cfg.minX;
      els.xSlider.max = cfg.maxX;
      els.xSlider.value = cfg.defaultX;
    }
    if (els.xInput) {
      els.xInput.min = cfg.minX;
      els.xInput.max = cfg.maxX;
      els.xInput.value = cfg.defaultX;
    }
    if (els.xVal) {
      els.xVal.textContent = cfg.defaultX;
    }
  }
  updateKScale(els);
  updateCScale(els);
  updateFn();
}
