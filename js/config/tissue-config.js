export const tissueConfig = {
  "Liver": {
    name: "Liver (excluding capsule)",
    E_full: [1.0, 4.0],
    E_tight: [1.0, 3.0],
    c_main: [2.0, 10.0],
    c_tight: [2.0, 6.0],
    nu: { min: 0.30, max: 0.45, default: 0.42, step: 0.01 },
    priority: "in vivo > in situ > ex vivo"
  },
  "Kidney": {
    name: "Kidney (parenchyma, excluding capsule)",
    E_full: [1.0, 5.0],
    E_tight: [1.0, 3.0],
    c_main: [2.0, 10.0],
    c_tight: [2.0, 6.0],
    nu: { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
    priority: "in vivo > in situ > ex vivo"
  },
  "Spleen": {
    name: "Spleen (parenchyma, excluding capsule)",
    E_full: [1.0, 4.0],
    E_tight: [1.5, 3.0],
    c_main: [2.0, 8.0],
    c_tight: [2.0, 5.0],
    nu: { min: 0.47, max: 0.49, default: 0.48, step: 0.01 },
    priority: "in vivo > in situ > ex vivo"
  }
};
