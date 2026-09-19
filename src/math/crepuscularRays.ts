/**
 * Crepuscular Rays (God Rays) & Volumetric Light Shaft Integration
 * Calculates post-process radial blur accumulation and light-shaft occlusions in screen-space.
 */

export interface LightShaftConfig {
  density: number;
  decay: number;
  weight: number;
  exposure: number;
  samples: number;
}

export const DEFAULT_LIGHT_SHAFT_CONFIG: LightShaftConfig = {
  density: 0.92,
  decay: 0.96,
  weight: 0.58,
  exposure: 0.35,
  samples: 64,
};

export class CrepuscularRays {
  private config: LightShaftConfig;

  constructor(config: Partial<LightShaftConfig> = {}) {
    this.config = { ...DEFAULT_LIGHT_SHAFT_CONFIG, ...config };
  }

  /**
   * Projects a 3D world-space sun direction into 2D normalized screen-space coordinates [0, 1].
   * @param sunDir - Normalized 3D vector towards the sun
   * @param viewProjMatrix - 4x4 View-Projection matrix (16 floats)
   */
  public projectSunToScreen(
    sunDir: [number, number, number],
    viewProjMatrix: Float32Array | number[]
  ): { x: number; y: number; inFront: boolean } {
    const x = sunDir[0] * 10000.0;
    const y = sunDir[1] * 10000.0;
    const z = sunDir[2] * 10000.0;

    // Transform by view-proj matrix
    const clipX = x * viewProjMatrix[0] + y * viewProjMatrix[4] + z * viewProjMatrix[8] + viewProjMatrix[12];
    const clipY = x * viewProjMatrix[1] + y * viewProjMatrix[5] + z * viewProjMatrix[9] + viewProjMatrix[13];
    const clipW = x * viewProjMatrix[3] + y * viewProjMatrix[7] + z * viewProjMatrix[11] + viewProjMatrix[15];

    if (clipW <= 0.0001) {
      return { x: 0.5, y: 0.5, inFront: false };
    }

    const ndcX = clipX / clipW;
    const ndcY = clipY / clipW;

    return {
      x: ndcX * 0.5 + 0.5,
      y: ndcY * 0.5 + 0.5,
      inFront: true,
    };
  }

  /**
   * CPU reference calculation for radial crepuscular light integration along ray vectors.
   */
  public sampleLightShaftAccumulation(
    uv: [number, number],
    sunScreenPos: [number, number],
    sampleOcclusion: (coord: [number, number]) => number
  ): number {
    let delta = [
      (uv[0] - sunScreenPos[0]) * (1.0 / this.config.samples) * this.config.density,
      (uv[1] - sunScreenPos[1]) * (1.0 / this.config.samples) * this.config.density,
    ];

    let currentCoord: [number, number] = [uv[0], uv[1]];
    let illuminationDecay = 1.0;
    let accumulatedRay = 0.0;

    for (let i = 0; i < this.config.samples; i++) {
      currentCoord[0] -= delta[0];
      currentCoord[1] -= delta[1];

      // Clamp coordinates to screen space
      if (currentCoord[0] < 0 || currentCoord[0] > 1 || currentCoord[1] < 0 || currentCoord[1] > 1) {
        break;
      }

      const sampleDensity = sampleOcclusion(currentCoord);
      accumulatedRay += sampleDensity * illuminationDecay * this.config.weight;
      illuminationDecay *= this.config.decay;
    }

    return accumulatedRay * this.config.exposure;
  }
}
