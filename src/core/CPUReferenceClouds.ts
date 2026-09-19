/**
 * Headless CPU Reference Volumetric Cloud Raymarcher.
 * Simulates atmospheric radiative transfer along view rays for analytical verification.
 */

import { CloudConfig } from '../types';
import { AtmosphericOptics } from '../math/phase';
import { CloudNoise } from '../math/noise';

export interface RaymarchPixelResult {
  color: [number, number, number];
  alpha: number;
  stepsTaken: number;
  transmittance: number;
}

export class CPUReferenceClouds {
  /**
   * Marches a single primary ray through the atmospheric cloud layer.
   */
  public static marchRay(
    rayOrigin: [number, number, number],
    rayDir: [number, number, number],
    config: CloudConfig,
    time: number = 0.0
  ): RaymarchPixelResult {
    // Check if ray points above horizon
    if (rayDir[1] <= 0.001) {
      return { color: [0, 0, 0], alpha: 0.0, stepsTaken: 0, transmittance: 1.0 };
    }

    const tNear = Math.max(0.0, (config.cloudBottom - rayOrigin[1]) / rayDir[1]);
    const tFar = (config.cloudTop - rayOrigin[1]) / rayDir[1];

    if (tFar <= tNear) {
      return { color: [0, 0, 0], alpha: 0.0, stepsTaken: 0, transmittance: 1.0 };
    }

    const cosTheta =
      rayDir[0] * config.sunDirection[0] +
      rayDir[1] * config.sunDirection[1] +
      rayDir[2] * config.sunDirection[2];

    const phase = AtmosphericOptics.dualLobePhase(cosTheta);

    let transmittance = 1.0;
    let accumR = 0, accumG = 0, accumB = 0;

    const stepSize = Math.min(config.stepSize, (tFar - tNear) / config.maxSteps);
    let currentT = tNear;
    let steps = 0;

    for (let s = 0; s < config.maxSteps; s++) {
      if (currentT >= tFar || transmittance < 0.01) {
        break;
      }
      steps++;

      const px = rayOrigin[0] + rayDir[0] * currentT;
      const py = rayOrigin[1] + rayDir[1] * currentT;
      const pz = rayOrigin[2] + rayDir[2] * currentT;

      const density = CloudNoise.sampleCloudDensity(
        px + time * 20.0,
        py,
        pz + time * 10.0,
        config.coverage,
        config.cloudBottom,
        config.cloudTop
      ) * config.densityMultiplier;

      if (density > 0.001) {
        // Secondary light march
        let lightOpticalDepth = 0.0;
        const lightStep = 60.0;
        for (let l = 1; l <= config.lightSteps; l++) {
          const lx = px + config.sunDirection[0] * (l * lightStep);
          const ly = py + config.sunDirection[1] * (l * lightStep);
          const lz = pz + config.sunDirection[2] * (l * lightStep);
          lightOpticalDepth += CloudNoise.sampleCloudDensity(
            lx, ly, lz, config.coverage, config.cloudBottom, config.cloudTop
          ) * lightStep;
        }

        const lightTrans = AtmosphericOptics.beerLambert(lightOpticalDepth * 0.035, 1.0);
        const sunTermR = config.sunColor[0] * lightTrans * phase;
        const sunTermG = config.sunColor[1] * lightTrans * phase;
        const sunTermB = config.sunColor[2] * lightTrans * phase;

        const ambientFactor = 0.6 + 0.4 * ((py - config.cloudBottom) / (config.cloudTop - config.cloudBottom));
        const ambR = config.ambientColor[0] * ambientFactor;
        const ambG = config.ambientColor[1] * ambientFactor;
        const ambB = config.ambientColor[2] * ambientFactor;

        const stepOpticalDepth = density * stepSize * 0.035;
        const stepTrans = Math.exp(-stepOpticalDepth);

        const contribFactor = density * transmittance * stepSize;
        accumR += (sunTermR + ambR) * contribFactor;
        accumG += (sunTermG + ambG) * contribFactor;
        accumB += (sunTermB + ambB) * contribFactor;

        transmittance *= stepTrans;
      }

      currentT += stepSize;
    }

    return {
      color: [accumR, accumG, accumB],
      alpha: 1.0 - transmittance,
      stepsTaken: steps,
      transmittance,
    };
  }
}
