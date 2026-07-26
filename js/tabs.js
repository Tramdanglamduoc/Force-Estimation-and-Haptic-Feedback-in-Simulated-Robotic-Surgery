import { physicsTabHTML } from './tabs/physics-tab-html.js';
import { structureTabHTML } from './tabs/structure-tab-html.js';

export const tabs = [
  { id: "physics", label: "Physics model", ready: true },
  { id: "structure", label: "Tissue structure", ready: true },
  { id: "sensor", label: "Sensor simulation", ready: false, items: [
    "Gaussian noise standard deviation slider",
    "Sensor/communication latency slider (ms)",
    "Raw signal vs. true force vs. PINN-recovered estimate plot"
  ] },
  { id: "validation", label: "Validation", ready: false, items: [
    "PINN prediction vs. synthetic ground truth (CoppeliaSim)",
    "RMSE / R² metric cards",
    "Residual plot"
  ] },
  { id: "comparison", label: "Model comparison", ready: false, items: [
    "Ranking table: PINN vs. LSTM/MLP baseline vs. pure physics model",
    "Compared across scenarios from Tool & contact / Tissue structure tabs"
  ] },
  { id: "sensitivity", label: "Sensitivity & uncertainty", ready: false, items: [
    "Tornado chart (±5% parameter variation)",
    "Monte Carlo uncertainty decomposition",
    "PINN stage — uncertainty: MC Dropout / Deep Ensembles",
    "PINN stage — explainability: SHAP / feature attribution"
  ] },
  { id: "haptic", label: "Haptic preview", ready: false, items: [
    "Animated force-vs-time playback",
    "Synchronized needle/gauge indicator"
  ] },
  { id: "library", label: "Scenario library", ready: false, items: [
    "Save/load named presets",
    "Export current configuration + plots as PDF/report"
  ] }
];

/**
 * Switch the active tab visibility
 * @param {string} id Active tab ID
 */
export function showTab(id) {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.id === id));
  document.querySelectorAll(".tabpanel").forEach(p => p.classList.toggle("active", p.id === "panel-" + id));
  const paramPanel = document.getElementById("paramPanel");
  if (paramPanel) {
    paramPanel.style.display = (id === "physics") ? "" : "none";
  }
}

/**
 * Initialize tab bar buttons and corresponding panel structures in the DOM
 */
export function initTabs() {
  const tabNav = document.getElementById("tabNav");
  const tabContent = document.getElementById("tabContent");
  if (!tabNav || !tabContent) return;

  tabNav.innerHTML = "";
  tabContent.innerHTML = "";

  tabs.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.textContent = t.label;
    btn.dataset.id = t.id;
    if (i === 0) btn.classList.add("active");
    btn.onclick = () => showTab(t.id);
    tabNav.appendChild(btn);
  });

  // Build panels
  tabs.forEach(t => {
    const panel = document.createElement("div");
    panel.className = "tabpanel";
    panel.id = "panel-" + t.id;
    if (t.id === "physics") {
      panel.classList.add("active");
      panel.innerHTML = physicsTabHTML();
    } else if (t.id === "structure") {
      panel.innerHTML = structureTabHTML();
    } else {
      panel.innerHTML = `
        <div class="card placeholder-card">
          <span class="badge future">Coming soon</span>
          <h3>${t.label}</h3>
          <p class="sub">Planned components for this tab / sắp triển khai:</p>
          <ul>${t.items.map(x => `<li>${x}</li>`).join("")}</ul>
        </div>`;
    }
    tabContent.appendChild(panel);
  });
}
