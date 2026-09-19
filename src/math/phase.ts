/**
 * Atmospheric Optics & Scattering Phase Functions.
 * Implements dual-lobe Henyey-Greenstein Mie scattering and Beer-Lambert extinction with powder-sugar effects.
 */

import { AtmosphereParams, DEFAULT_ATMOSPHERE_PARAMS } from '../types';

export class AtmosphericOptics {
  /**
   * Single-lobe Henyey-Greenstein phase function p(cosTheta, g).
   * Describes directional angular distribution of light scattered by cloud water droplets.
   */
  public static henyeyGreenstein(cosTheta: number, g: number): number {
    const g2 = g * g;
    const denom = Math.pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
    return (1.0 / (4.0 * Math.PI)) * ((1.0 - g2) / Math.max(denom, 1e-6));
  }

  /**
   * Dual-lobe Henyey-Greenstein phase function.
   * Blends strong forward scattering (silver lining around sun) with backward back-scattering peak.
   */
  public static dualLobePhase(
    cosTheta: number,
    params: AtmosphereParams = DEFAULT_ATMOSPHERE_PARAMS
  ): number {
    const forward = this.henyeyGreenstein(cosTheta, params.phaseForwardG);
    const backward = this.henyeyGreenstein(cosTheta, params.phaseBackwardG);
    return params.phaseBlend * forward + (1.0 - params.phaseBlend) * backward;
  }

  /**
   * Beer-Lambert law attenuation with "powder sugar" extinction enhancement.
   * Simulates multiple internal forward-scattering near cloud boundaries.
   *
   * @param opticalDepth Integrated optical density along ray segment.
   * @param powderFactor Scaling of the powder-sugar absorption effect.
   */
  public static beerLambert(opticalDepth: number, powderFactor: number = 1.0): number {
    const beer = Math.exp(-opticalDepth);
    const powder = 1.0 - Math.exp(-opticalDepth * 2.0 * powderFactor);
    return beer * Math.max(powder, 0.05);
  }

  /**
   * Vertical density profile gradient modeling Cumulus cloud mass distribution.
   * Clouds are flat at base (condensation altitude) and pillowy near top.
   *
   * @param altitude Current sampling altitude in meters.
   * @param bottom Base altitude.
   * @param top Ceiling altitude.
   */
  public static heightDensityGradient(altitude: number, bottom: number, top: number): number {
    if (altitude < bottom || altitude > top) return 0.0;
    const h = (altitude - bottom) / (top - bottom);
    // Smoothstep rise at bottom, parabolic billow at center, taper at top
    const rise = Math.min(h / 0.15, 1.0);
    const fall = Math.min((1.0 - h) / 0.35, 1.0);
    return rise * fall;
  }
}
