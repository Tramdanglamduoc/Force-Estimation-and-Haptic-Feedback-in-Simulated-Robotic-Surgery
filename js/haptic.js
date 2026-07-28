import {
  mmToM,
  calculateRelaxationTime,
  calculateMaxwellForce,
  calculateEffectiveStiffness
} from './physics.js';

// Seeded PRNG for deterministic live sensor generation
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function nextGaussianSeeded(prng) {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Global haptic state
let state = {
  currentTime: 0,
  isPlaying: false,
  playbackSpeed: 1.0,
  audioContext: null,
  oscillator: null,
  gainNode: null,
  audioEnabled: false,
  audioSource: 'ground_truth', // 'ground_truth' or 'sensor'
  mappingMode: 'both', // 'pitch', 'volume', or 'both'
  minFrequency: 150,
  maxFrequency: 1500,
  masterVolume: 40, // 0 to 100
  lastFrameTime: null,
  animationFrameId: null,
  
  // Precomputed sensor samples for the current cycle
  sensorSamples: [],
  sensorDt: 0.01,
  
  // Computed limits
  F_min: 0,
  F_max: 1.0
};

/**
 * Initialize all Haptic Preview elements and event handlers
 * @param {Object} els Object mapping element IDs to DOM elements
 */
export function initHapticTab(els) {
  // Elements map locally
  const hPlayBtn = document.getElementById("hapticPlayBtn");
  const playText = document.getElementById("playText");
  const playIcon = document.getElementById("playIcon");
  const hScrubBar = document.getElementById("hapticScrubBar");
  const hTimeCurrent = document.getElementById("hapticTimeCurrent");
  const hTimeTotal = document.getElementById("hapticTimeTotal");
  const hPhaseLabel = document.getElementById("hapticPhaseLabel");
  const hElasticBar = document.getElementById("hapticElasticBar");
  const hViscousBar = document.getElementById("hapticViscousBar");
  const hElasticVal = document.getElementById("hapticElasticVal");
  const hViscousVal = document.getElementById("hapticViscousVal");
  
  // Audio controls
  const hAudioToggle = document.getElementById("hapticAudioToggle");
  const srcGroundTruthBtn = document.getElementById("srcGroundTruthBtn");
  const srcSensorBtn = document.getElementById("srcSensorBtn");
  const hMappingMode = document.getElementById("hapticMappingMode");
  const hMinFreqSlider = document.getElementById("hapticMinFreqSlider");
  const hMinFreqVal = document.getElementById("hapticMinFreqVal");
  const hMaxFreqSlider = document.getElementById("hapticMaxFreqSlider");
  const hMaxFreqVal = document.getElementById("hapticMaxFreqVal");
  const hVolumeSlider = document.getElementById("hapticVolumeSlider");
  const hVolumeVal = document.getElementById("hapticVolumeVal");
  
  const speedBtns = document.querySelectorAll(".speed-btn");

  if (!hPlayBtn || !hScrubBar) return;

  // 1. Audio toggles and selections
  if (hAudioToggle) {
    hAudioToggle.addEventListener("click", () => {
      hAudioToggle.classList.toggle("on");
      state.audioEnabled = hAudioToggle.classList.contains("on");
      if (state.audioEnabled) {
        initAudio();
      } else {
        muteAudio();
      }
    });
  }

  if (srcGroundTruthBtn && srcSensorBtn) {
    srcGroundTruthBtn.addEventListener("click", () => {
      srcGroundTruthBtn.classList.add("active");
      srcGroundTruthBtn.style.background = "var(--teal)";
      srcGroundTruthBtn.style.color = "#fff";
      srcSensorBtn.classList.remove("active");
      srcSensorBtn.style.background = "transparent";
      srcSensorBtn.style.color = "var(--text-muted)";
      state.audioSource = 'ground_truth';
      recalculateCycleData(els);
    });

    srcSensorBtn.addEventListener("click", () => {
      srcSensorBtn.classList.add("active");
      srcSensorBtn.style.background = "var(--teal)";
      srcSensorBtn.style.color = "#fff";
      srcGroundTruthBtn.classList.remove("active");
      srcGroundTruthBtn.style.background = "transparent";
      srcGroundTruthBtn.style.color = "var(--text-muted)";
      state.audioSource = 'sensor';
      recalculateCycleData(els);
    });
  }

  if (hMappingMode) {
    hMappingMode.addEventListener("change", () => {
      state.mappingMode = hMappingMode.value;
    });
  }

  if (hMinFreqSlider && hMinFreqVal) {
    hMinFreqSlider.addEventListener("input", () => {
      state.minFrequency = parseInt(hMinFreqSlider.value);
      hMinFreqVal.textContent = state.minFrequency;
    });
  }

  if (hMaxFreqSlider && hMaxFreqVal) {
    hMaxFreqSlider.addEventListener("input", () => {
      state.maxFrequency = parseInt(hMaxFreqSlider.value);
      hMaxFreqVal.textContent = state.maxFrequency;
    });
  }

  if (hVolumeSlider && hVolumeVal) {
    hVolumeSlider.addEventListener("input", () => {
      state.masterVolume = parseInt(hVolumeSlider.value);
      hVolumeVal.textContent = state.masterVolume + "%";
    });
  }

  // 2. Playback speed controls
  speedBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      speedBtns.forEach(b => {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "var(--text-muted)";
      });
      btn.classList.add("active");
      btn.style.background = "var(--teal)";
      btn.style.color = "#fff";
      state.playbackSpeed = parseFloat(btn.dataset.speed);
    });
  });

  // 3. Play / Pause Action
  hPlayBtn.addEventListener("click", () => {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  });

  // 4. Scrubbing
  hScrubBar.addEventListener("input", () => {
    pausePlayback(); // Always pause on dragging
    const T = getCyclePeriod(els);
    state.currentTime = parseFloat(hScrubBar.value) * T;
    updatePlaybackUI(els);
  });

  // 5. Setup tab change detection to auto-pause on navigating away
  document.addEventListener("tabChanged", (e) => {
    if (e.detail.tabId !== "haptic") {
      pausePlayback();
    } else {
      recalculateCycleData(els);
      updatePlaybackUI(els);
    }
  });

  // 6. Listen to updates on other tabs to pause & recompute
  const inputSelectors = [
    "eSlider", "nuSlider", "cMaterialSlider", "contactRadiusSlider", "lSlider",
    "jawAreaSlider", "thicknessSlider", "xSlider", "vSlider", "holdSlider",
    "rampMinSlider", "rampMaxSlider", "heteroToggle", "inclusionDepthSlider",
    "stiffnessRatioSlider", "tissueType", "toolType", "modelType", "mcToggle"
  ];
  inputSelectors.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        pausePlayback();
        recalculateCycleData(els);
        updatePlaybackUI(els);
      });
      // also handle dropdown/toggles changing
      el.addEventListener("change", () => {
        pausePlayback();
        recalculateCycleData(els);
        updatePlaybackUI(els);
      });
      if (el.tagName === "BUTTON" || el.classList.contains("switch")) {
        el.addEventListener("click", () => {
          pausePlayback();
          recalculateCycleData(els);
          updatePlaybackUI(els);
        });
      }
    }
  });

  // Perform initial calculation
  recalculateCycleData(els);
  updatePlaybackUI(els);
}

/**
 * Returns single cycle period T based on current sliders
 */
function getCyclePeriod(els) {
  const x = parseFloat(els.xSlider.value);
  const v = parseFloat(els.vSlider.value);
  const hold = parseFloat(els.holdSlider.value);
  const rampMin = parseFloat(els.rampMinSlider.value);
  const rampMax = parseFloat(els.rampMaxSlider.value);
  
  const rampT = Math.min(rampMax, Math.max(rampMin, x / v));
  return 2 * rampT + hold;
}

/**
 * Recalculate dynamic min/max force limits and sensor samples for the current configurations
 */
function recalculateCycleData(els) {
  const T = getCyclePeriod(els);
  const xTarget = parseFloat(els.xSlider.value);
  const vTarget = parseFloat(els.vSlider.value);
  const holdDuration = parseFloat(els.holdSlider.value);
  const rampMin = parseFloat(els.rampMinSlider.value);
  const rampMax = parseFloat(els.rampMaxSlider.value);
  
  const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
  const modelType = els.modelTypeSelect ? els.modelTypeSelect.value : "Kelvin-Voigt";

  const isHetero = els.heteroToggle && els.heteroToggle.classList.contains("on");
  const D_inclusion = els.inclusionDepthSlider ? parseFloat(els.inclusionDepthSlider.value) : 5.0;
  const stiffness_ratio = els.stiffnessRatioSlider ? parseFloat(els.stiffnessRatioSlider.value) : 1.0;
  const k = parseFloat(els.kSlider.value);
  const c = parseFloat(els.cSlider.value);

  function xOfT(t) {
    if (t < 0) return 0;
    if (t >= T) return 0;
    if (t < rampT) return xTarget * (t / rampT);
    if (t < rampT + holdDuration) return xTarget;
    return xTarget * Math.max(0, (T - t) / rampT);
  }

  function vOfT(t) {
    if (t < 0) return 0;
    if (t >= T) return 0;
    if (t < rampT) return xTarget / rampT;
    if (t < rampT + holdDuration) return 0;
    return -xTarget / rampT;
  }

  function getFTrue(t) {
    const depth = xOfT(t);
    const vel = vOfT(t);
    const kEff = calculateEffectiveStiffness(depth, k, isHetero, D_inclusion, stiffness_ratio);
    if (modelType === "Maxwell") {
      return calculateMaxwellForce(t, kEff, c, xTarget, vTarget, holdDuration, rampMin, rampMax);
    } else {
      return kEff * mmToM(depth) + c * mmToM(vel);
    }
  }

  // 1. Find min and max Ground Truth forces over the cycle
  let minTrue = Infinity;
  let maxTrue = -Infinity;
  const evalSteps = 100;
  for (let i = 0; i <= evalSteps; i++) {
    const t = (i / evalSteps) * T;
    const f = getFTrue(t);
    if (f < minTrue) minTrue = f;
    if (f > maxTrue) maxTrue = f;
  }

  // 2. Generate live sensor samples if selected or needed
  const rate = parseFloat(els.sensorRateSlider.value) || 100;
  state.sensorDt = 1.0 / rate;
  const sigma = parseFloat(els.sensorNoiseSlider.value) || 0;
  const latency = (parseFloat(els.sensorLatencySlider.value) || 0) / 1000.0;
  const bias = parseFloat(els.sensorBiasSlider.value) || 0;
  const step_size = parseFloat(els.sensorQuantSlider.value) || 0;
  const F_max_sensor = parseFloat(els.sensorSatSlider.value) || 0.5;
  const dropout_prob = (parseFloat(els.sensorDropoutSlider.value) || 0) / 100.0;

  const prng = mulberry32(42);
  const totalSamples = Math.floor(T / state.sensorDt);
  state.sensorSamples = [];

  let prevSensorVal = null;
  for (let i = 0; i <= totalSamples; i++) {
    const tSample = i * state.sensorDt;
    const tDelayed = Math.max(0, tSample - latency);
    const fSampled = getFTrue(tDelayed);
    const fBiased = fSampled + bias;
    const noise = nextGaussianSeeded(prng) * sigma;
    const fNoisy = fBiased + noise;
    
    let fQuantized = fNoisy;
    if (step_size > 0) {
      fQuantized = Math.round(fNoisy / step_size) * step_size;
    }
    
    let fSensorVal = Math.max(0, Math.min(F_max_sensor, fQuantized));
    
    // Packet Dropout
    let isDropout = false;
    if (i > 0 && dropout_prob > 0) {
      if (prng() < dropout_prob) {
        isDropout = true;
      }
    }
    if (isDropout && prevSensorVal !== null) {
      fSensorVal = prevSensorVal;
    } else {
      prevSensorVal = fSensorVal;
    }
    
    state.sensorSamples.push(fSensorVal);
  }

  // Assign visual bounds of the gauge based on min/max of F_true over the cycle with a 5% margin
  const rangeTrue = maxTrue - minTrue;
  const margin = rangeTrue * 0.05 || 0.005;
  state.F_min = minTrue - margin;
  state.F_max = maxTrue + margin;

  // Make sure current time does not exceed cycle duration
  if (state.currentTime > T) {
    state.currentTime = 0;
  }
}

/**
 * ZOH sensor value retrieval at time t
 */
function getFSensorLive(t) {
  if (state.sensorSamples.length === 0) return 0;
  const idx = Math.floor(t / state.sensorDt);
  const clampedIdx = Math.max(0, Math.min(state.sensorSamples.length - 1, idx));
  return state.sensorSamples[clampedIdx];
}

/**
 * Setup Web Audio API nodes
 */
function initAudio() {
  if (state.audioContext) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    
    state.oscillator = state.audioContext.createOscillator();
    state.oscillator.type = 'sine';
    
    state.gainNode = state.audioContext.createGain();
    state.gainNode.gain.setValueAtTime(0, state.audioContext.currentTime);
    
    state.oscillator.connect(state.gainNode);
    state.gainNode.connect(state.audioContext.destination);
    
    state.oscillator.start();
  } catch (e) {
    console.error("Failed to initialize Web Audio:", e);
  }
}

function muteAudio() {
  if (state.gainNode && state.audioContext) {
    state.gainNode.gain.setValueAtTime(0, state.audioContext.currentTime);
  }
}

function startPlayback() {
  state.isPlaying = true;
  const playText = document.getElementById("playText");
  const playIcon = document.getElementById("playIcon");
  if (playText) playText.textContent = "Pause";
  if (playIcon) playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;

  if (state.audioEnabled) {
    initAudio();
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  }

  state.lastFrameTime = performance.now();
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  state.animationFrameId = requestAnimationFrame(playbackLoop);
}

function pausePlayback() {
  state.isPlaying = false;
  const playText = document.getElementById("playText");
  const playIcon = document.getElementById("playIcon");
  if (playText) playText.textContent = "Play";
  if (playIcon) playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  
  muteAudio();
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
}

function getPhase(t, els) {
  const x = parseFloat(els.xSlider.value);
  const v = parseFloat(els.vSlider.value);
  const hold = parseFloat(els.holdSlider.value);
  const rampMin = parseFloat(els.rampMinSlider.value);
  const rampMax = parseFloat(els.rampMaxSlider.value);
  const rampT = Math.min(rampMax, Math.max(rampMin, x / v));

  if (t < rampT) return "Indenting";
  if (t < rampT + hold) return "Holding";
  return "Releasing";
}

/**
 * Continuous animation frame loop
 */
function playbackLoop(timestamp) {
  if (!state.isPlaying) return;

  const els = {
    xSlider: document.getElementById("xSlider"),
    vSlider: document.getElementById("vSlider"),
    holdSlider: document.getElementById("holdSlider"),
    rampMinSlider: document.getElementById("rampMinSlider"),
    rampMaxSlider: document.getElementById("rampMaxSlider"),
    kSlider: document.getElementById("kSlider"),
    cSlider: document.getElementById("cSlider"),
    modelTypeSelect: document.getElementById("modelType"),
    heteroToggle: document.getElementById("heteroToggle"),
    inclusionDepthSlider: document.getElementById("inclusionDepthSlider"),
    stiffnessRatioSlider: document.getElementById("stiffnessRatioSlider"),
    sensorRateSlider: document.getElementById("sensorRateSlider"),
    sensorNoiseSlider: document.getElementById("sensorNoiseSlider"),
    sensorLatencySlider: document.getElementById("sensorLatencySlider"),
    sensorBiasSlider: document.getElementById("sensorBiasSlider"),
    sensorQuantSlider: document.getElementById("sensorQuantSlider"),
    sensorSatSlider: document.getElementById("sensorSatSlider"),
    sensorDropoutSlider: document.getElementById("sensorDropoutSlider"),
    mcToggle: document.getElementById("mcToggle")
  };

  const T = getCyclePeriod(els);
  const dt = (timestamp - state.lastFrameTime) / 1000.0;
  state.lastFrameTime = timestamp;

  // Advance time
  state.currentTime += dt * state.playbackSpeed;
  if (state.currentTime >= T) {
    state.currentTime = state.currentTime % T;
  }

  updatePlaybackUI(els);

  state.animationFrameId = requestAnimationFrame(playbackLoop);
}

/**
 * Update UI gauge, needles, components bar, time values, and audio sonification
 */
function updatePlaybackUI(els) {
  const T = getCyclePeriod(els);
  const t = state.currentTime;

  const xTarget = parseFloat(els.xSlider.value);
  const vTarget = parseFloat(els.vSlider.value);
  const holdDuration = parseFloat(els.holdSlider.value);
  const rampMin = parseFloat(els.rampMinSlider.value);
  const rampMax = parseFloat(els.rampMaxSlider.value);
  const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
  
  const isHetero = els.heteroToggle && els.heteroToggle.classList.contains("on");
  const D_inclusion = els.inclusionDepthSlider ? parseFloat(els.inclusionDepthSlider.value) : 5.0;
  const stiffness_ratio = els.stiffnessRatioSlider ? parseFloat(els.stiffnessRatioSlider.value) : 1.0;
  const k = parseFloat(els.kSlider.value);
  const c = parseFloat(els.cSlider.value);
  const modelType = els.modelTypeSelect ? els.modelTypeSelect.value : "Kelvin-Voigt";

  function xOfT(tVal) {
    if (tVal < 0 || tVal >= T) return 0;
    if (tVal < rampT) return xTarget * (tVal / rampT);
    if (tVal < rampT + holdDuration) return xTarget;
    return xTarget * Math.max(0, (T - tVal) / rampT);
  }

  function vOfT(tVal) {
    if (tVal < 0 || tVal >= T) return 0;
    if (tVal < rampT) return xTarget / rampT;
    if (tVal < rampT + holdDuration) return 0;
    return -xTarget / rampT;
  }

  const depth = xOfT(t);
  const vel = vOfT(t);
  const kEff = calculateEffectiveStiffness(depth, k, isHetero, D_inclusion, stiffness_ratio);

  // Compute live forces
  let F_true = 0;
  if (modelType === "Maxwell") {
    F_true = calculateMaxwellForce(t, kEff, c, xTarget, vTarget, holdDuration, rampMin, rampMax);
  } else {
    F_true = kEff * mmToM(depth) + c * mmToM(vel);
  }

  const F_elastic = kEff * mmToM(depth);
  const F_viscous = c * mmToM(vel);

  // Get active audio signal
  const F_sensor = getFSensorLive(t);
  const F_audio = state.audioSource === 'sensor' ? F_sensor : F_true;

  // 1. Text & Progress reads
  const hTimeCurrent = document.getElementById("hapticTimeCurrent");
  const hTimeTotal = document.getElementById("hapticTimeTotal");
  const hScrubBar = document.getElementById("hapticScrubBar");
  const hPhaseLabel = document.getElementById("hapticPhaseLabel");

  if (hTimeCurrent) hTimeCurrent.textContent = t.toFixed(2) + "s";
  if (hTimeTotal) hTimeTotal.textContent = T.toFixed(2) + "s";
  if (hScrubBar) hScrubBar.value = t / T;
  
  if (hPhaseLabel) {
    if (state.isPlaying) {
      const phase = getPhase(t, els);
      hPhaseLabel.textContent = phase;
      hPhaseLabel.style.background = phase === "Indenting" ? "#EAF3EF" : (phase === "Holding" ? "#FDF2E4" : "#EDF1F3");
      hPhaseLabel.style.color = phase === "Indenting" ? "var(--teal)" : (phase === "Holding" ? "#B06A18" : "var(--text-muted)");
    } else {
      hPhaseLabel.textContent = "PAUSED";
      hPhaseLabel.style.background = "#EDF1F3";
      hPhaseLabel.style.color = "var(--text-muted)";
    }
  }

  // 2. Bar components split
  const maxBarForce = Math.max(0.1, state.F_max);
  const pctElastic = Math.min(100, Math.max(0, (F_elastic / maxBarForce) * 100));
  const pctViscous = Math.min(100, Math.max(0, (F_viscous / maxBarForce) * 100));

  const hElasticBar = document.getElementById("hapticElasticBar");
  const hViscousBar = document.getElementById("hapticViscousBar");
  const hElasticVal = document.getElementById("hapticElasticVal");
  const hViscousVal = document.getElementById("hapticViscousVal");

  if (hElasticBar) hElasticBar.style.width = pctElastic + "%";
  if (hViscousBar) hViscousBar.style.width = pctViscous + "%";
  if (hElasticVal) hElasticVal.textContent = F_elastic.toFixed(3) + " N";
  if (hViscousVal) hViscousVal.textContent = F_viscous.toFixed(3) + " N";

  // 3. Render Gauge
  drawGauge(F_true, t, els);

  // 4. Sonification logic
  if (state.audioEnabled && state.audioContext && state.isPlaying) {
    let audioMin = state.F_min;
    let audioMax = state.F_max;
    if (state.audioSource === 'sensor') {
      const F_max_sensor = parseFloat(els.sensorSatSlider.value) || 0.5;
      audioMin = 0;
      audioMax = F_max_sensor;
    } else {
      // Use exact F_true bounds without the dial margin for precise sound scaling
      const rangeTrue = state.F_max - state.F_min;
      const marginVal = rangeTrue / 1.1 * 0.05;
      audioMin = state.F_min + marginVal;
      audioMax = state.F_max - marginVal;
    }
    const range = audioMax - audioMin;
    const ratio = range > 0 ? Math.min(1, Math.max(0, (F_audio - audioMin) / range)) : 0;
    
    // Frequency Pitch Mapping
    const targetFreq = state.minFrequency + ratio * (state.maxFrequency - state.minFrequency);
    
    // Volume Gain Mapping
    const targetVol = (state.masterVolume / 100.0) * ratio;

    const currTime = state.audioContext.currentTime;

    if (state.mappingMode === 'both') {
      state.oscillator.frequency.setValueAtTime(targetFreq, currTime);
      state.gainNode.gain.setValueAtTime(targetVol, currTime);
    } else if (state.mappingMode === 'pitch') {
      state.oscillator.frequency.setValueAtTime(targetFreq, currTime);
      // Constant volume at master volume setting
      state.gainNode.gain.setValueAtTime(state.masterVolume / 100.0, currTime);
    } else if (state.mappingMode === 'volume') {
      // Constant frequency at base minFrequency
      state.oscillator.frequency.setValueAtTime(state.minFrequency, currTime);
      state.gainNode.gain.setValueAtTime(targetVol, currTime);
    }
  }
}

/**
 * Speedometer gauge rendering on canvas
 */
function drawGauge(F_true, t, els) {
  const canvas = document.getElementById("gaugeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H - 30;
  const r = 90;

  // Angles for semi-circular dial (180 deg)
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  // 1. Draw Dial Arch background
  ctx.strokeStyle = "#EDF1F3";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.stroke();

  // 2. Draw Uncertainty band if Monte Carlo is ON
  const mcOn = els.mcToggle && els.mcToggle.classList.contains("on");
  if (mcOn && window.bootstrapCache && window.bootstrapCache.k_boot) {
    const k_boot = window.bootstrapCache.k_boot;
    const c_boot = window.bootstrapCache.c_boot;
    
    const xTarget = parseFloat(els.xSlider.value);
    const vTarget = parseFloat(els.vSlider.value);
    const holdDuration = parseFloat(els.holdSlider.value);
    const rampMin = parseFloat(els.rampMinSlider.value);
    const rampMax = parseFloat(els.rampMaxSlider.value);
    const rampT = Math.min(rampMax, Math.max(rampMin, xTarget / vTarget));
    const T = 2 * rampT + holdDuration;
    
    const isHetero = els.heteroToggle && els.heteroToggle.classList.contains("on");
    const D_inclusion = els.inclusionDepthSlider ? parseFloat(els.inclusionDepthSlider.value) : 5.0;
    const stiffness_ratio = els.stiffnessRatioSlider ? parseFloat(els.stiffnessRatioSlider.value) : 1.0;
    const modelType = els.modelTypeSelect ? els.modelTypeSelect.value : "Kelvin-Voigt";

    function xOfT(tVal) {
      if (tVal < 0 || tVal >= T) return 0;
      if (tVal < rampT) return xTarget * (tVal / rampT);
      if (tVal < rampT + holdDuration) return xTarget;
      return xTarget * Math.max(0, (T - tVal) / rampT);
    }
    function vOfT(tVal) {
      if (tVal < 0 || tVal >= T) return 0;
      if (tVal < rampT) return xTarget / rampT;
      if (tVal < rampT + holdDuration) return 0;
      return -xTarget / rampT;
    }

    const d_val = xOfT(t);
    const v_val = vOfT(t);

    // Compute distribution of force F_i(t) at current time
    const F_dist = [];
    for (let i = 0; i < k_boot.length; i++) {
      const kEff_boot = calculateEffectiveStiffness(d_val, k_boot[i], isHetero, D_inclusion, stiffness_ratio);
      let f_i = 0;
      if (modelType === "Maxwell") {
        f_i = calculateMaxwellForce(t, kEff_boot, c_boot[i], xTarget, vTarget, holdDuration, rampMin, rampMax);
      } else {
        f_i = kEff_boot * mmToM(d_val) + c_boot[i] * mmToM(v_val);
      }
      F_dist.push(f_i);
    }
    F_dist.sort((a, b) => a - b);
    const f25 = F_dist[Math.floor(0.025 * F_dist.length)];
    const f975 = F_dist[Math.floor(0.975 * F_dist.length)];

    // Map f2.5 and f97.5 to dial angles
    const range = state.F_max - state.F_min;
    if (range > 0) {
      const ratio25 = Math.min(1, Math.max(0, (f25 - state.F_min) / range));
      const ratio975 = Math.min(1, Math.max(0, (f975 - state.F_min) / range));
      const a25 = startAngle + ratio25 * Math.PI;
      const a975 = startAngle + ratio975 * Math.PI;

      // Draw shaded band
      ctx.strokeStyle = "rgba(55, 138, 221, 0.3)";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a25, a975);
      ctx.stroke();
    }
  }

  // 3. Draw Needle mapping
  const needleRange = state.F_max - state.F_min;
  const needleRatio = needleRange > 0 ? Math.min(1, Math.max(0, (F_true - state.F_min) / needleRange)) : 0;
  const needleAngle = startAngle + needleRatio * Math.PI;

  ctx.strokeStyle = "var(--teal)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + (r - 12) * Math.cos(needleAngle), cy + (r - 12) * Math.sin(needleAngle));
  ctx.stroke();

  // Draw center hub
  ctx.fillStyle = "var(--navy)";
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fill();

  // 4. Dial text readouts
  ctx.fillStyle = "var(--navy)";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(F_true.toFixed(3) + " N", cx, cy + 22);

  // Min / Max readouts
  ctx.fillStyle = "var(--text-muted)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(state.F_min.toFixed(2) + " N", cx - r, cy + 18);
  ctx.textAlign = "right";
  ctx.fillText(state.F_max.toFixed(2) + " N", cx + r, cy + 18);
}
