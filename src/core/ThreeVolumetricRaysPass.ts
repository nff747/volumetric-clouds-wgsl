/**
 * ThreeVolumetricRaysPass
 * Post-processing pass for Three.js that adds screen-space Crepuscular Rays (God Rays)
 * based on camera view projection and sun position.
 */

import { CrepuscularRays, LightShaftConfig, DEFAULT_LIGHT_SHAFT_CONFIG } from '../math/crepuscularRays';

export interface GodRayUniforms {
  tDiffuse: { value: any };
  sunScreenPos: { value: [number, number] };
  density: { value: number };
  decay: { value: number };
  weight: { value: number };
  exposure: { value: number };
  samples: { value: number };
}

export class ThreeVolumetricRaysPass {
  public config: LightShaftConfig;
  public uniforms: GodRayUniforms;
  private readonly raysMath: CrepuscularRays;

  constructor(config: Partial<LightShaftConfig> = {}) {
    this.config = { ...DEFAULT_LIGHT_SHAFT_CONFIG, ...config };
    this.raysMath = new CrepuscularRays(this.config);

    this.uniforms = {
      tDiffuse: { value: null },
      sunScreenPos: { value: [0.5, 0.5] },
      density: { value: this.config.density },
      decay: { value: this.config.decay },
      weight: { value: this.config.weight },
      exposure: { value: this.config.exposure },
      samples: { value: this.config.samples },
    };
  }

  /**
   * Updates sun screen position given camera matrices and 3D sun direction.
   */
  public updateSunPosition(
    sunDir: [number, number, number],
    viewProjMatrix: Float32Array | number[]
  ): boolean {
    const projected = this.raysMath.projectSunToScreen(sunDir, viewProjMatrix);
    this.uniforms.sunScreenPos.value = [projected.x, projected.y];
    return projected.inFront;
  }

  /**
   * Generates WGSL / GLSL shader chunk for the radial occlusion blur.
   */
  public getFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform vec2 sunScreenPos;
      uniform float density;
      uniform float decay;
      uniform float weight;
      uniform float exposure;
      varying vec2 vUv;

      void main() {
        vec2 deltaTextCoord = (vUv - sunScreenPos) * (1.0 / 64.0) * density;
        vec2 textCoord = vUv;
        vec4 color = texture2D(tDiffuse, textCoord);
        float illuminationDecay = 1.0;

        for (int i = 0; i < 64; i++) {
          textCoord -= deltaTextCoord;
          vec4 sample = texture2D(tDiffuse, textCoord);
          sample *= illuminationDecay * weight;
          color += sample;
          illuminationDecay *= decay;
        }

        gl_FragColor = color * exposure;
      }
    `;
  }
}
