import { describe, it, expect } from 'vitest';
import { computeVerticalProfile, CLOUD_TYPE_PRESETS } from '../src/utils/weather';

describe('Weather Presets and Vertical Profiles', () => {
  it('should return 0 outside boundary altitude limits', () => {
    expect(computeVerticalProfile(0.5, 'stratus')).toBe(0);
    expect(computeVerticalProfile(3.0, 'stratus')).toBe(0);
    expect(computeVerticalProfile(12.0, 'cirrus')).toBe(0);
  });

  it('should compute positive density within layer altitude', () => {
    const cumulusMid = (CLOUD_TYPE_PRESETS.cumulus.bottomAltitudeKm + CLOUD_TYPE_PRESETS.cumulus.topAltitudeKm) / 2;
    const density = computeVerticalProfile(cumulusMid, 'cumulus');
    expect(density).toBeGreaterThan(0.5);
  });

  it('should model cumulonimbus anvil top expansion', () => {
    // Top 10% of cumulonimbus
    const cbAnvil = 8.5;
    const anvilDensity = computeVerticalProfile(cbAnvil, 'cumulonimbus');
    expect(anvilDensity).toBeGreaterThanOrEqual(1.0);
  });
});
