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
        plotSensor.zoomState = { tMin: 0, tMax: plotSensor.datasetCache.T_total };
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
        // Copy cache and zoomState
        plotSensorModal.datasetCache = plotSensor.datasetCache;
        plotSensorModal.zoomState = { ...plotSensor.zoomState };

        import('./plots.js').then(({ renderSensorPlotWindow }) => {
          renderSensorPlotWindow(plotSensorModal);
        });

        // Wire zoom/pan events on modal canvas if not done
        if (!plotSensorModal.zoomEventsWired) {
          plotSensorModal.zoomEventsWired = true;

          plotSensorModal.addEventListener("wheel", (e) => {
            e.preventDefault();
            const cache = plotSensorModal.datasetCache;
            if (!cache) return;

            const zoom = plotSensorModal.zoomState || { tMin: 0, tMax: cache.T_total };
            const tRange = zoom.tMax - zoom.tMin;

            const rect = plotSensorModal.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const plotW = plotSensorModal.width - 55 - 15; // PAD_X = 55, RIGHT_MARGIN = 15
            const mouseT = zoom.tMin + ((mouseX - 55) / plotW) * tRange;

            const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
            let newRange = tRange * zoomFactor;
            newRange = Math.max(0.05, Math.min(cache.T_total, newRange));

            const tMinNew = Math.max(0, mouseT - (mouseT - zoom.tMin) * (newRange / tRange));
            const tMaxNew = Math.min(cache.T_total, tMinNew + newRange);

            plotSensorModal.zoomState = { tMin: tMinNew, tMax: tMaxNew };
            import('./plots.js').then(({ renderSensorPlotWindow }) => {
              renderSensorPlotWindow(plotSensorModal);
            });
          });

          let isDragging = false;
          let startX = 0;
          let startTMin = 0;
          let startTMax = 0;

          plotSensorModal.addEventListener("mousedown", (e) => {
            const cache = plotSensorModal.datasetCache;
            if (!cache) return;
            isDragging = true;
            startX = e.clientX;
            const zoom = plotSensorModal.zoomState || { tMin: 0, tMax: cache.T_total };
            startTMin = zoom.tMin;
            startTMax = zoom.tMax;
            plotSensorModal.style.cursor = "grabbing";
          });

          window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const cache = plotSensorModal.datasetCache;
            if (!cache) return;

            const plotW = plotSensorModal.width - 55 - 15;
            const tRange = startTMax - startTMin;
            const dx = e.clientX - startX;
            const dt = (dx / plotW) * tRange;

            let tMinNew = startTMin - dt;
            let tMaxNew = startTMax - dt;

            if (tMinNew < 0) {
              tMinNew = 0;
              tMaxNew = tRange;
            }
            if (tMaxNew > cache.T_total) {
              tMaxNew = cache.T_total;
              tMinNew = cache.T_total - tRange;
            }

            plotSensorModal.zoomState = { tMin: tMinNew, tMax: tMaxNew };
            import('./plots.js').then(({ renderSensorPlotWindow }) => {
              renderSensorPlotWindow(plotSensorModal);
            });
          });

          window.addEventListener("mouseup", () => {
            if (isDragging) {
              isDragging = false;
              plotSensorModal.style.cursor = "default";
            }
          });
        }
      }
    });
  }

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      sensorModal.style.display = "none";
    });
  }

  const resetModalZoomBtn = document.getElementById("resetModalZoomBtn");
  if (resetModalZoomBtn) {
    resetModalZoomBtn.addEventListener("click", () => {
      if (plotSensorModal && plotSensorModal.datasetCache) {
        plotSensorModal.zoomState = { tMin: 0, tMax: plotSensorModal.datasetCache.T_total };
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
  });
});
