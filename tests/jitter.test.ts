import { describe, it, expect } from 'vitest';
import { BlueNoiseJitter } from '../src/utils/blueNoise';

describe('BlueNoiseJitter', () => {
  it('should initialize table with bounded values in [0, 1)', () => {
    const jitter = new BlueNoiseJitter(32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const val = jitter.getJitter(x, y, 0);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1.0);
      }
    }
  });

  it('should temporally decorrelate successive frames', () => {
    const jitter = new BlueNoiseJitter(64);
    const valFrame0 = jitter.getJitter(15, 23, 0);
    const valFrame1 = jitter.getJitter(15, 23, 1);
    expect(valFrame0).not.toBeCloseTo(valFrame1, 4);
  });

  it('should generate valid Halton subpixel offsets', () => {
    const jitter = new BlueNoiseJitter();
    const [dx, dy] = jitter.getSubpixelJitter(1);
    expect(dx).toBeGreaterThanOrEqual(-0.5);
    expect(dx).toBeLessThanOrEqual(0.5);
    expect(dy).toBeGreaterThanOrEqual(-0.5);
    expect(dy).toBeLessThanOrEqual(0.5);
  });
});
