import { tissueConfig } from '../config/tissue-config.js';
import { toolConfig } from '../config/tool-config.js';

export function updateESliderBackground(els, cfg) {
  if (!els.eSlider) return;
  const min = cfg.E_full[0];
  const max = cfg.E_full[1];
  const tightMin = cfg.E_tight[0];
  const tightMax = cfg.E_tight[1];
  
  const pMin = ((tightMin - min) / (max - min)) * 100;
  const pMax = ((tightMax - min) / (max - min)) * 100;
  
  els.eSlider.style.setProperty('--track-background', `linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMax}%, rgba(255, 255, 255, 0.15) ${pMax}%, rgba(255, 255, 255, 0.15) 100%)`);
}

export function updateCMaterialSliderBackground(els, cfg) {
  if (!els.cMaterialSlider) return;
  const min = cfg.c_main[0];
  const max = cfg.c_main[1];
  const tightMin = cfg.c_tight[0];
  const tightMax = cfg.c_tight[1];
  
  const pMin = ((tightMin - min) / (max - min)) * 100;
  const pMax = ((tightMax - min) / (max - min)) * 100;
  
  els.cMaterialSlider.style.setProperty('--track-background', `linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMax}%, rgba(255, 255, 255, 0.15) ${pMax}%, rgba(255, 255, 255, 0.15) 100%)`);
}

export function updateLSliderBackground(els, toolCfg) {
  if (!els.lSlider) return;
  const min = parseFloat(els.lSlider.min);
  const max = parseFloat(els.lSlider.max);
  const tightMin = toolCfg.minL;
  const tightMax = toolCfg.maxL;
  
  const pMin = ((tightMin - min) / (max - min)) * 100;
  const pMax = ((tightMax - min) / (max - min)) * 100;
  
  els.lSlider.style.setProperty('--track-background', `linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.15) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMin}%, rgba(29, 158, 117, 0.4) ${pMax}%, rgba(255, 255, 255, 0.15) ${pMax}%, rgba(255, 255, 255, 0.15) 100%)`);
}

export function updateKScale(els) {
  if (!els.tissueTypeSelect || !els.toolTypeSelect || !els.kSlider) return;
  const selectedTissue = els.tissueTypeSelect.value;
  const cfg = tissueConfig[selectedTissue];
  const selectedTool = els.toolTypeSelect.value;
  const toolCfg = toolConfig[selectedTool];
  if (!cfg || !toolCfg) return;
  
  let kMinScale = 0;
  let kMaxScale = 500;
  
  if (toolCfg.group === "A") {
    const aMin = parseFloat(els.contactRadiusSlider.min) / 1000;
    const aMax = parseFloat(els.contactRadiusSlider.max) / 1000;
    const EMin = cfg.E_full[0] * 1000;
    const EMax = cfg.E_full[1] * 1000;
    const nuMin = cfg.nu.min;
    const nuMax = cfg.nu.max;
    
    kMinScale = (2 * aMin * EMin) / (1 - nuMin * nuMin);
    kMaxScale = (2 * aMax * EMax) / (1 - nuMax * nuMax);
  } else {
    const EMin = cfg.E_full[0] * 1000;
    const EMax = cfg.E_full[1] * 1000;
    const AMin = parseFloat(els.jawAreaSlider.min) * 1e-6;
    const AMax = parseFloat(els.jawAreaSlider.max) * 1e-6;
    const hMin = parseFloat(els.thicknessSlider.min) / 1000;
    const hMax = parseFloat(els.thicknessSlider.max) / 1000;
    
    kMinScale = (EMin * AMin) / hMax;
    kMaxScale = (EMax * AMax) / hMin;
  }
  
  els.kSlider.min = kMinScale.toFixed(2);
  els.kSlider.max = kMaxScale.toFixed(2);
}

export function updateCScale(els) {
  if (!els.tissueTypeSelect || !els.toolTypeSelect || !els.cSlider) return;
  const selectedTissue = els.tissueTypeSelect.value;
  const cfg = tissueConfig[selectedTissue];
  const selectedTool = els.toolTypeSelect.value;
  const toolCfg = toolConfig[selectedTool];
  if (!cfg || !toolCfg) return;
  
  let cMinScale = 0;
  let cMaxScale = 100;
  
  if (toolCfg.group === "A") {
    const aMin = parseFloat(els.contactRadiusSlider.min) / 1000;
    const aMax = parseFloat(els.contactRadiusSlider.max) / 1000;
    const cMin = cfg.c_main[0] * 1000;
    const cMax = cfg.c_main[1] * 1000;
    const lMin = parseFloat(els.lSlider.min) / 1000;
    const lMax = parseFloat(els.lSlider.max) / 1000;
    
    cMinScale = (cMin * Math.PI * aMin * aMin) / lMax;
    cMaxScale = (cMax * Math.PI * aMax * aMax) / lMin;
  } else {
    const cMin = cfg.c_main[0] * 1000;
    const cMax = cfg.c_main[1] * 1000;
    const AMin = parseFloat(els.jawAreaSlider.min) * 1e-6;
    const AMax = parseFloat(els.jawAreaSlider.max) * 1e-6;
    const hMin = parseFloat(els.thicknessSlider.min) / 1000;
    const hMax = parseFloat(els.thicknessSlider.max) / 1000;
    
    cMinScale = (cMin * AMin) / hMax;
    cMaxScale = (cMax * AMax) / hMin;
  }
  
  els.cSlider.min = cMinScale.toFixed(2);
  els.cSlider.max = cMaxScale.toFixed(2);
}
