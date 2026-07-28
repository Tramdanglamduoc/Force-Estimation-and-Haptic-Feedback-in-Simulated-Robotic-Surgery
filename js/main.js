import { initTabs } from './tabs.js';
import { getElements } from './ui/dom-elements.js';
import { toggleMonteCarlo, updateMonteCarloVisibility, initParamPanel } from './ui/ui-toggles.js';
import { handleTissueChange, handleToolChange } from './ui/tissue-tool-handlers.js';
import { update } from './core/update-cycle.js';
import { initEventWiring } from './core/event-wiring.js';
import { initTissueStructure } from './tabs/tissue-structure-tab.js';

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

  // Wire up Tissue Structure controls
  initTissueStructure(els, () => update(els));

  // Wire up Sensor Zoom & Modal controls
  const resetBtn = document.getElementById("resetZoomBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const plotSensor = document.getElementById("plotSensor");
      if (plotSensor && plotSensor.datasetCache) {
        plotSensor.zoomState = { tMin: 0, tMax: plotSensor.datasetCache.T_total, fMin: undefined, fMax: undefined, userHasSetYBounds: false };
        import('./plots.js').then(({ renderSensorPlotWindow }) => {
          renderSensorPlotWindow(plotSensor);
        });
      }
    });
  }

  const expandBtn = document.getElementById("expandSensorBtn");
  const sensorModal = document.getElementById("sensorModal");
  const closeModal = document.getElementById("closeSensorModal");
  const plotSensorModal = document.getElementById("plotSensorModal");

  if (expandBtn && sensorModal) {
    expandBtn.addEventListener("click", () => {
      const plotSensor = document.getElementById("plotSensor");
      if (plotSensor && plotSensor.datasetCache) {
        sensorModal.style.display = "flex";
        // Share cache by reference and copy zoomState exactly
        plotSensorModal.datasetCache = plotSensor.datasetCache;
        plotSensorModal.zoomState = { ...plotSensor.zoomState };

        import('./plots.js').then(({ renderSensorPlotWindow, wireSensorPlotEvents }) => {
          wireSensorPlotEvents(plotSensorModal);
          renderSensorPlotWindow(plotSensorModal);
        });
      }
    });
  }

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      sensorModal.style.display = "none";
      const plotSensor = document.getElementById("plotSensor");
      if (plotSensor && plotSensorModal && plotSensorModal.zoomState) {
        // Sync zoomState back to standard canvas on close
        plotSensor.zoomState = { ...plotSensorModal.zoomState };
        import('./plots.js').then(({ renderSensorPlotWindow }) => {
          renderSensorPlotWindow(plotSensor);
        });
      }
    });
  }

  const resetModalZoomBtn = document.getElementById("resetModalZoomBtn");
  if (resetModalZoomBtn) {
    resetModalZoomBtn.addEventListener("click", () => {
      if (plotSensorModal && plotSensorModal.datasetCache) {
        plotSensorModal.zoomState = { tMin: 0, tMax: plotSensorModal.datasetCache.T_total, fMin: undefined, fMax: undefined, userHasSetYBounds: false };
        import('./plots.js').then(({ renderSensorPlotWindow }) => {
          renderSensorPlotWindow(plotSensorModal);
        });
      }
    });
  }

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

    // Initialize Haptic tab controller
    import('./haptic.js').then(({ initHapticTab }) => {
      initHapticTab(els);
    });

    // Initialize Sensitivity tab controller
    import('./core/sensitivity-tab.js').then(({ initSensitivityTab }) => {
      initSensitivityTab(els, () => update(els));
    });
  });
});
