export function updateMonteCarloVisibility(els) {
  if (els.mcToggle && els.uncertaintyPanel) {
    const isMcOn = els.mcToggle.classList.contains("on");
    if (isMcOn) {
      els.uncertaintyPanel.style.display = "";
      if (els.panelsRow) els.panelsRow.classList.remove("mc-off");
    } else {
      els.uncertaintyPanel.style.display = "none";
      if (els.panelsRow) els.panelsRow.classList.add("mc-off");
    }
  }
}

export function toggleMonteCarlo(els) {
  if (els.mcToggle) {
    els.mcToggle.classList.toggle("on");
    updateMonteCarloVisibility(els);
  }
}

export function initParamPanel(els) {
  if (els.paramPanelHeader && els.paramPanel) {
    els.paramPanelHeader.addEventListener("click", () => {
      els.paramPanel.classList.toggle("collapsed");
      const isCollapsed = els.paramPanel.classList.contains("collapsed");
      const label = els.paramPanelHeader.querySelector("span:first-child");
      if (label) {
        label.textContent = isCollapsed ? "Show material & tool parameters" : "Hide material & tool parameters";
      }
    });
  }
}
