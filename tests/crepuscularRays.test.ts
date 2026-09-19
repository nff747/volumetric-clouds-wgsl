import { describe, it, expect } from 'vitest';
import { CrepuscularRays } from '../src/math/crepuscularRays';

describe('CrepuscularRays (God Rays)', () => {
  it('should initialize with default config', () => {
    const rays = new CrepuscularRays();
    expect(rays).toBeDefined();
  });

  it('should accurately project sun coordinate to screen space', () => {
    const rays = new CrepuscularRays();
    // Identity view-proj matrix
    const identity = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
    const res = rays.projectSunToScreen([0, 0, 1], identity);
    expect(res.inFront).toBe(true);
    expect(res.x).toBeCloseTo(0.5, 3);
    expect(res.y).toBeCloseTo(0.5, 3);
  });

  it('should accumulate light shafts along radial rays', () => {
    const rays = new CrepuscularRays({ samples: 16, weight: 0.5, decay: 0.9 });
    // Flat transmittance / occluder field of 1.0
    const accum = rays.sampleLightShaftAccumulation([0.8, 0.8], [0.5, 0.5], () => 1.0);
    expect(accum).toBeGreaterThan(0.0);
  });
});
