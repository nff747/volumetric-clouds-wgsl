/**
 * Weather Presets and Cloud Type Vertical Density Gradients
 * Models Cirrus, Stratus, Cumulus, and Cumulonimbus vertical coverage.
 */

export type CloudType = 'stratus' | 'cumulus' | 'cumulonimbus' | 'cirrus';

export interface CloudAltitudeLayer {
  bottomAltitudeKm: number;
  topAltitudeKm: number;
  coverage: number;
  densityMultiplier: number;
  precipitationFactor: number;
}

export const CLOUD_TYPE_PRESETS: Record<CloudType, CloudAltitudeLayer> = {
  stratus: {
    bottomAltitudeKm: 1.0,
    topAltitudeKm: 2.2,
    coverage: 0.85,
    densityMultiplier: 0.6,
    precipitationFactor: 0.1,
  },
  cumulus: {
    bottomAltitudeKm: 1.5,
    topAltitudeKm: 4.5,
    coverage: 0.45,
    densityMultiplier: 1.2,
    precipitationFactor: 0.0,
  },
  cumulonimbus: {
    bottomAltitudeKm: 1.2,
    topAltitudeKm: 9.0,
    coverage: 0.70,
    densityMultiplier: 2.5,
    precipitationFactor: 0.85,
  },
  cirrus: {
    bottomAltitudeKm: 7.0,
    topAltitudeKm: 10.5,
    coverage: 0.30,
    densityMultiplier: 0.25,
    precipitationFactor: 0.0,
  },
};

/**
 * Computes altitude fraction and vertical shape factor for a specific cloud type.
 */
export function computeVerticalProfile(
  altitudeKm: number,
  type: CloudType
): number {
  const layer = CLOUD_TYPE_PRESETS[type];
  if (altitudeKm < layer.bottomAltitudeKm || altitudeKm > layer.topAltitudeKm) {
    return 0.0;
  }
  const heightFraction = (altitudeKm - layer.bottomAltitudeKm) / (layer.topAltitudeKm - layer.bottomAltitudeKm);

  // Anvil / dome shaping depending on cloud type
  switch (type) {
    case 'stratus':
      // Flat sheet with soft transitions at edges
      return Math.sin(heightFraction * Math.PI) * 0.9;
    case 'cumulus':
      // Fluffy rounded tops, flatter bottoms
      return Math.sin(Math.pow(heightFraction, 0.7) * Math.PI);
    case 'cumulonimbus':
      // Massive vertical tower expanding into an anvil top
      if (heightFraction > 0.8) {
        return 1.2; // Anvil flare
      }
      return 0.6 + 0.4 * Math.sin(heightFraction * Math.PI);
    case 'cirrus':
      // Wispy, high-altitude thin streaks
      return Math.sin(heightFraction * Math.PI) * 0.35;
  }
}
