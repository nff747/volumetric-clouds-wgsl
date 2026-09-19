import { describe, it, expect } from 'vitest';
import { ThreeVolumetricRaysPass } from '../src/core/ThreeVolumetricRaysPass';

describe('ThreeVolumetricRaysPass', () => {
  it('should construct pass and expose proper uniforms', () => {
    const pass = new ThreeVolumetricRaysPass({ density: 0.95, samples: 32 });
    expect(pass.uniforms.density.value).toBe(0.95);
    expect(pass.uniforms.samples.value).toBe(32);
    expect(pass.uniforms.sunScreenPos.value).toEqual([0.5, 0.5]);
  });

  it('should update sun screen position accurately', () => {
    const pass = new ThreeVolumetricRaysPass();
    const identity = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
    const visible = pass.updateSunPosition([0, 0, 1], identity);
    expect(visible).toBe(true);
    expect(pass.uniforms.sunScreenPos.value[0]).toBeCloseTo(0.5, 2);
    expect(pass.uniforms.sunScreenPos.value[1]).toBeCloseTo(0.5, 2);
  });

  it('should return valid fragment shader source', () => {
    const pass = new ThreeVolumetricRaysPass();
    const shader = pass.getFragmentShader();
    expect(shader).toContain('sunScreenPos');
    expect(shader).toContain('illuminationDecay');
  });
});
