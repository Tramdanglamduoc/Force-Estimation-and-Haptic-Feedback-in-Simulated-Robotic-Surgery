# Force-Estimation-and-Haptic-Feedback-in-Simulated-Robotic-Surgery


**Physics-based force estimation and haptic feedback for simulated robotic surgery**

🔗 **[Live demo](https://force-estimation-and-haptic-feedback.netlify.app)** · Summer research, Özyeğin University (2026), Biomedical Physics track, supervised by Prof. Burçin Ünlü

<p align="center">
  <img src="assets/screenshot.png" width="800" alt="TissueSense interface">
</p>

## Why

In robotic laparoscopic surgery the surgeon no longer feels the tissue: the robot cuts the haptic loop. TissueSense estimates the force between an instrument and soft tissue from viscoelastic models, so it could be fed back to the surgeon as haptic or audio cues.

## What it does

Pick a **tissue** (liver, kidney, spleen), a **viscoelastic model** and one of **6 laparoscopic instruments**, then explore five tabs:

| Tab | What you see |
|---|---|
| **Physics model** | Force over a ramp–hold–release indentation, split into elastic and viscous parts |
| **Tissue structure** | Heterogeneous tissue: a stiffer inclusion under the surface, with a smooth 2 mm transition |
| **Sensor simulation** | Synthetic noisy force readings and the fitted stiffness *k* and damping *c* |
| **Sensitivity & uncertainty** | How parameters drive the force; 1,000-sample bootstrap confidence intervals |
| **Haptic preview** | The estimated force turned into sound with the Web Audio API |

## Models

- **Kelvin-Voigt:** `F = k·x + c·ẋ`
- **Maxwell:** spring and dashpot in series, relaxation time `τ = c / k`, closed-form force over ramp, hold and release
- **Confinement factor** from Poisson's ratio: `(1 − ν) / ((1 + ν)(1 − 2ν))`
- **Instrument contact**, two groups:
  - *Point/edge tools* (needle, probe, hook, cannula): contact radius *a* and contact length *L*
  - *Jaw tools* (flat grasper, grasping/bipolar forceps): jaw area *A* and tissue thickness *h*

Tissue moduli are set within typical ranges reported in elastography and indentation studies (shaded on each slider).

## Parameter estimation

1. Generate 50 synthetic force samples with 5% Gaussian noise (seeded, so results are reproducible).
2. Fit *k* and *c*: linear least squares for Kelvin-Voigt; a log-linear fit of the hold-phase relaxation for Maxwell.
3. Bootstrap the fit 1,000 times to get confidence intervals.

## Run locally

No build step. The app uses ES modules, so serve it rather than opening the file directly:

```bash
git clone https://github.com/Tramdanglamduoc/Force-Estimation-and-Haptic-Feedback-in-Simulated-Robotic-Surgery.git
cd Force-Estimation-and-Haptic-Feedback-in-Simulated-Robotic-Surgery
python -m http.server 8000
```

Then open http://localhost:8000.

## Project structure

```
├── index.html
├── styles.css
└── js/
    ├── main.js        # entry point
    ├── physics.js     # Kelvin-Voigt / Maxwell, fitting, bootstrap
    ├── plots.js       # charts
    ├── haptic.js      # Web Audio sonification
    ├── tabs.js        # tab navigation
    ├── tabs/          # one module per tab
    ├── core/ config/ ui/
```

## Limitations

- Force data is synthetic; the models have not been validated against real tissue measurements yet.
- Kelvin-Voigt and Maxwell are linear models; real tissue is nonlinear and anisotropic.
- Contact geometry is simplified (e.g. edge contact approximated as circular).

## Roadmap

Standard Linear Solid (Zener) · Generalized Maxwell · Fung's quasi-linear viscoelasticity · fractional-order models

## Acknowledgments

Developed during summer research at Özyeğin University under Prof. Burçin Ünlü.
