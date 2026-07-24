/**
 * Physics engine for simulated robotic surgery haptic feedback.
 * Implements Kelvin-Voigt viscoelastic model: F = k * x + c * v
 */

/**
 * Convert millimeters to meters (or mm/s to m/s)
 * @param {number} mm value in mm
 * @returns {number} value in meters
 */
export function mmToM(mm) {
  return mm / 1000;
}

/**
 * Calculate the elastic component of the Kelvin-Voigt force
 * @param {number} k stiffness (N/m)
 * @param {number} x_m depth (m)
 * @returns {number} elastic force (N)
 */
export function calculateElasticForce(k, x_m) {
  return k * x_m;
}

/**
 * Calculate the viscous component of the Kelvin-Voigt force
 * @param {number} c damping (Ns/m)
 * @param {number} v_m velocity (m/s)
 * @returns {number} viscous force (N)
 */
export function calculateViscousForce(c, v_m) {
  return c * v_m;
}

/**
 * Calculate the total Kelvin-Voigt force
 * @param {number} fElastic elastic force component (N)
 * @param {number} fViscous viscous force component (N)
 * @returns {number} total force (N)
 */
export function calculateTotalForce(fElastic, fViscous) {
  return fElastic + fViscous;
}

/**
 * Calculate the raw confidence interval widths for E and c (illustrative bootstrap CI)
 * @param {number} E elastic modulus (kPa)
 * @param {number} c damping value (Ns/m)
 * @returns {{ciEWidth: number, ciCWidth: number}} raw CI widths
 */
export function calculateUncertainty(E, c) {
  const ciEWidth = E * 0.15;
  const ciCWidth = c * 0.15;
  return {
    ciEWidth,
    ciCWidth
  };
}
