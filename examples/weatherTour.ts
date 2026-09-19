/**
 * Weather Tour Example
 * Demonstrates switching between cloud types dynamically with realistic lighting transitions.
 */

import { CLOUD_TYPE_PRESETS, CloudType, computeVerticalProfile } from '../src/utils/weather';
import { HenyeyGreensteinPhase } from '../src/math/henyeyGreenstein';

export class WeatherTourController {
  private currentType: CloudType = 'cumulus';
  private transitionAlpha: number = 1.0;

  public setWeatherType(type: CloudType) {
    this.currentType = type;
  }

  public getAtmosphereSummary(): string {
    const preset = CLOUD_TYPE_PRESETS[this.currentType];
    const forwardPhase = HenyeyGreensteinPhase.evaluateDualLobe(0.85, 0.7, -0.2, 0.65);
    return `[WeatherTour] Type: ${this.currentType} | Altitude: ${preset.bottomAltitudeKm}-${preset.topAltitudeKm}km | Coverage: ${(preset.coverage * 100).toFixed(0)}% | Sun Scatter Phase: ${forwardPhase.toFixed(3)}`;
  }
}

if (typeof window === 'undefined') {
  const tour = new WeatherTourController();
  console.log(tour.getAtmosphereSummary());
  tour.setWeatherType('cumulonimbus');
  console.log(tour.getAtmosphereSummary());
}
