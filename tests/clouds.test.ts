import { describe, it, expect } from 'vitest';
import {
  AtmosphericOptics,
  CloudNoise,
  CloudRenderer,
  CPUReferenceClouds,
  DEFAULT_CLOUD_CONFIG,
  cloudMarchShader,
} from '../src/index';

describe('AtmosphericOptics Phase & Extinction Mechanics', () => {
  it('should evaluate Henyey-Greenstein forward scattering peak', () => {
    const fwdPeak = AtmosphericOptics.henyeyGreenstein(1.0, 0.8);
    const sideScatter = AtmosphericOptics.henyeyGreenstein(0.0, 0.8);
    const backScatter = AtmosphericOptics.henyeyGreenstein(-1.0, 0.8);

    expect(fwdPeak).toBeGreaterThan(sideScatter * 5.0);
    expect(sideScatter).toBeGreaterThan(backScatter);
  });

  it('should blend forward silver-lining and backward back-scatter in dual-lobe phase', () => {
    const phaseFwd = AtmosphericOptics.dualLobePhase(0.95);
    const phaseBack = AtmosphericOptics.dualLobePhase(-0.95);
    const phaseSide = AtmosphericOptics.dualLobePhase(0.0);

    expect(phaseFwd).toBeGreaterThan(phaseSide);
    expect(phaseBack).toBeGreaterThan(phaseSide);
  });

  it('should decrease transmittance with increasing optical depth in Beer-Lambert law', () => {
    const tThin = AtmosphericOptics.beerLambert(0.2, 1.0);
    const tThick = AtmosphericOptics.beerLambert(3.0, 1.0);

    expect(tThin).toBeGreaterThan(tThick);
    expect(tThin).toBeLessThanOrEqual(1.0);
    expect(tThick).toBeGreaterThan(0.0);
  });

  it('should clamp density outside cloud base and ceiling altitudes', () => {
    expect(AtmosphericOptics.heightDensityGradient(1000, 1500, 4000)).toBe(0.0);
    expect(AtmosphericOptics.heightDensityGradient(5000, 1500, 4000)).toBe(0.0);
    expect(AtmosphericOptics.heightDensityGradient(2500, 1500, 4000)).toBeGreaterThan(0.5);
  });
});

describe('CloudNoise 3D Procedural Generators', () => {
  it('should output bounded 3D Worley distances in [0, 1]', () => {
    for (let x = 0; x < 2; x += 0.5) {
      for (let y = 0; y < 2; y += 0.5) {
        for (let z = 0; z < 2; z += 0.5) {
          const w = CloudNoise.worley3D(x, y, z);
          expect(w).toBeGreaterThanOrEqual(0.0);
          expect(w).toBeLessThanOrEqual(1.0);
        }
      }
    }
  });

  it('should evaluate cloud density with coverage thresholding', () => {
    const dCovered = CloudNoise.sampleCloudDensity(500, 2500, 500, 0.8);
    const dClear = CloudNoise.sampleCloudDensity(500, 2500, 500, 0.1);
    expect(dCovered).toBeGreaterThanOrEqual(dClear);
  });
});

describe('CloudRenderer & CPUReferenceClouds Raymarcher', () => {
  it('should format 64-float uniform buffer layout with matrices', () => {
    const renderer = new CloudRenderer(null, { cloudBottom: 1200, cloudTop: 3500 });
    const dummyMat = new Float32Array(16);
    dummyMat[0] = 1.0;
    dummyMat[5] = 1.0;
    dummyMat[10] = 1.0;
    dummyMat[15] = 1.0;

    const uniforms = renderer.buildUniformData(1920, 1080, 2.5, [0, 100, 0], dummyMat, dummyMat);
    expect(uniforms.length).toBe(64);
    expect(uniforms[0]).toBe(1920);
    expect(uniforms[1]).toBe(1080);
    expect(uniforms[4]).toBe(1200);
    expect(uniforms[5]).toBe(3500);
    expect(uniforms[20]).toBe(1.0); // invProj identity diag
    expect(uniforms[36]).toBe(1.0); // invView identity diag
  });

  it('should simulate radiative transfer along primary view ray', () => {
    const res = CPUReferenceClouds.marchRay(
      [0, 100, 0],       // Ground camera
      [0.0, 0.5, 0.866], // Looking 30 deg above horizon
      DEFAULT_CLOUD_CONFIG,
      1.0
    );

    expect(res.stepsTaken).toBeGreaterThan(0);
    expect(res.transmittance).toBeGreaterThanOrEqual(0.0);
    expect(res.transmittance).toBeLessThanOrEqual(1.0);
    expect(res.color[0]).toBeGreaterThanOrEqual(0.0);
    expect(res.color[1]).toBeGreaterThanOrEqual(0.0);
    expect(res.color[2]).toBeGreaterThanOrEqual(0.0);
  });
});

describe('WGSL Cloud Marching Compute Shader', () => {
  it('should contain expected compute entrypoints and shader symbols', () => {
    expect(cloudMarchShader).toContain('@compute');
    expect(cloudMarchShader).toContain('@workgroup_size(16, 16)');
    expect(cloudMarchShader).toContain('dualPhase');
    expect(cloudMarchShader).toContain('sampleCloud');
    expect(cloudMarchShader).toContain('invProj');
    expect(cloudMarchShader).toContain('invView');
    expect(cloudMarchShader).toContain('outColorTex');
  });
});
