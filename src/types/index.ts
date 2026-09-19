/**
 * Volumetric Clouds & Atmospheric Raymarching Types.
 */

export interface CloudConfig {
  cloudBottom: number;         // Bottom altitude of cloud slab in meters (e.g. 1500.0)
  cloudTop: number;            // Top altitude of cloud slab in meters (e.g. 4000.0)
  coverage: number;            // Cloud cover fraction [0.0, 1.0] (e.g. 0.55)
  densityMultiplier: number;   // Cloud optical thickness multiplier (e.g. 0.8)
  sunDirection: [number, number, number]; // Normalized light vector towards sun
  sunColor: [number, number, number];     // Sun direct illuminance RGB
  ambientColor: [number, number, number]; // Ambient sky illuminance RGB
  windOffset: [number, number, number];   // Spatial drift vector (wx, wy, wz)
  maxSteps: number;            // Primary raymarch step limit (e.g. 64)
  lightSteps: number;          // Secondary light cone march steps (e.g. 6)
  stepSize: number;            // Base step length along view ray (e.g. 45.0m)
}

export interface AtmosphereParams {
  phaseForwardG: number;       // Forward Henyey-Greenstein parameter g1 (e.g. 0.82)
  phaseBackwardG: number;      // Backward Henyey-Greenstein parameter g2 (e.g. -0.22)
  phaseBlend: number;          // Dual-lobe blend fraction (e.g. 0.75)
  powderSugarEffect: number;   // Beer-Lambert dark edge powdering factor (e.g. 1.0)
  extinctionCoefficient: number; // Volume absorption + scattering rate sigma_t (e.g. 0.04)
}

export interface CloudTelemetry {
  fps: number;
  marchTimeMs: number;
  stepCount: number;
  transmittance: number;
  cloudHeightMeters: number;
}

export const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  cloudBottom: 1500.0,
  cloudTop: 4000.0,
  coverage: 0.52,
  densityMultiplier: 0.85,
  sunDirection: [0.5, 0.7, 0.5],
  sunColor: [1.2, 1.1, 0.95],
  ambientColor: [0.25, 0.35, 0.55],
  windOffset: [0.0, 0.0, 0.0],
  maxSteps: 64,
  lightSteps: 6,
  stepSize: 45.0,
};

export const DEFAULT_ATMOSPHERE_PARAMS: AtmosphereParams = {
  phaseForwardG: 0.82,
  phaseBackwardG: -0.22,
  phaseBlend: 0.75,
  powderSugarEffect: 1.0,
  extinctionCoefficient: 0.035,
};
