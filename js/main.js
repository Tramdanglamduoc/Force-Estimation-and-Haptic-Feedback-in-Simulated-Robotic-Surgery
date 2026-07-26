import { initTabs } from './tabs.js';
import { getElements } from './ui/dom-elements.js';
import { toggleMonteCarlo, updateMonteCarloVisibility, initParamPanel } from './ui/ui-toggles.js';
import { handleTissueChange, handleToolChange } from './ui/tissue-tool-handlers.js';
import { update } from './core/update-cycle.js';
import { initEventWiring } from './core/event-wiring.js';

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  
  const els = getElements();
  if (!els.kSlider) return; // safety guard if element querying failed

  // Wire up Monte Carlo toggle click event dynamically
  if (els.mcToggle) {
    els.mcToggle.addEventListener("click", () => {
      toggleMonteCarlo(els);
    });
  }

  // Wire up parameters panel toggle click event
  initParamPanel(els);

  // Wait for DOM to render physics panel before wiring inputs
  requestAnimationFrame(() => {
    const updateFn = () => update(els);
    const tissueChangeFn = () => handleTissueChange(els, updateFn);
    const toolChangeFn = () => handleToolChange(els, updateFn);
    
    initEventWiring(els, updateFn, tissueChangeFn, toolChangeFn);
    
    // Initialize tissue and tool defaults
    handleTissueChange(els, updateFn);
    handleToolChange(els, updateFn);
    update(els);
    updateMonteCarloVisibility(els);
  });
});
