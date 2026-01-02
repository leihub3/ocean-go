import type { ActivityStatus } from '../types/activity.js';
import type { ActivityThresholds } from '../types/region.js';
import type { WeatherData, TideData, HourlyForecast } from '../types/index.js';

export interface RuleContext {
  weather: WeatherData;
  tides: TideData[];
  hourlyForecast?: HourlyForecast[];
  thresholds: ActivityThresholds;
}

/**
 * Base rule evaluator helper functions
 */
export class BaseRules {
  /**
   * Evaluate wind conditions
   * 
   * Logic:
   * - Good: windSpeed <= 70% of maxWindSpeed (e.g., 2.0 m/s <= 4.2 m/s for snorkeling with 6 m/s threshold)
   * - Caution: 70% < windSpeed <= 100% of maxWindSpeed
   * - Bad: windSpeed > maxWindSpeed
   * 
   * Example: For snorkeling (maxWindSpeed = 6 m/s):
   * - 2.0 m/s: 2.0 <= 4.2 → 'good' ✓
   * - 5.0 m/s: 4.2 < 5.0 <= 6.0 → 'caution'
   * - 7.0 m/s: 7.0 > 6.0 → 'bad'
   */
  static evaluateWind(
    windSpeed: number,
    maxWindSpeed: number
  ): { status: ActivityStatus; severity: number } {
    if (windSpeed <= maxWindSpeed * 0.7) {
      return { status: 'good', severity: 0 };
    }
    if (windSpeed <= maxWindSpeed) {
      return { status: 'caution', severity: (windSpeed - maxWindSpeed * 0.7) / (maxWindSpeed * 0.3) };
    }
    return { status: 'bad', severity: (windSpeed - maxWindSpeed) / maxWindSpeed };
  }

  /**
   * Evaluate cloudiness conditions
   */
  static evaluateCloudiness(
    cloudiness: number,
    maxCloudiness: number
  ): { status: ActivityStatus; severity: number } {
    if (cloudiness <= maxCloudiness * 0.6) {
      return { status: 'good', severity: 0 };
    }
    if (cloudiness <= maxCloudiness) {
      return { status: 'caution', severity: (cloudiness - maxCloudiness * 0.6) / (maxCloudiness * 0.4) };
    }
    return { status: 'bad', severity: (cloudiness - maxCloudiness) / maxCloudiness };
  }

  /**
   * Evaluate rain conditions
   */
  static evaluateRain(
    rain: number,
    maxRain: number
  ): { status: ActivityStatus; severity: number } {
    if (rain === 0) {
      return { status: 'good', severity: 0 };
    }
    if (rain <= maxRain * 0.5) {
      return { status: 'caution', severity: rain / (maxRain * 0.5) };
    }
    return { status: 'bad', severity: rain / maxRain };
  }

  /**
   * Evaluate tide preference
   */
  static evaluateTide(
    currentTides: TideData[],
    preferredTide: 'high' | 'low' | null
  ): { status: ActivityStatus; nextPreferredTime?: string } {
    if (!preferredTide) {
      return { status: 'good' };
    }

    const now = new Date();
    const nextPreferredTide = currentTides.find(
      tide => tide.type === preferredTide && new Date(tide.time) > now
    );

    const currentTide = currentTides.find(
      tide => new Date(tide.time) <= now && 
      new Date(tide.time).getTime() > now.getTime() - 3 * 60 * 60 * 1000 // Within last 3 hours
    );

    if (currentTide?.type === preferredTide) {
      return { status: 'good', nextPreferredTime: nextPreferredTide?.time };
    }

    if (nextPreferredTide) {
      const hoursUntil = (new Date(nextPreferredTide.time).getTime() - now.getTime()) / (60 * 60 * 1000);
      if (hoursUntil <= 2) {
        return { status: 'caution', nextPreferredTime: nextPreferredTide.time };
      }
      return { status: 'bad', nextPreferredTime: nextPreferredTide.time };
    }

    return { status: 'caution' };
  }

  /**
   * Calculate ideal time window from hourly forecast
   */
  static calculateWindow(
    hourlyForecast: HourlyForecast[] | undefined,
    thresholds: ActivityThresholds,
    startHours: number = 0,
    maxHours: number = 8
  ): string | undefined {
    if (!hourlyForecast || hourlyForecast.length === 0) {
      return undefined;
    }

    let goodHours = 0;

    for (let i = startHours; i < Math.min(startHours + maxHours, hourlyForecast.length); i++) {
      const forecast = hourlyForecast[i];
      
      if (!forecast) break;
      
      const wind = this.evaluateWind(forecast.windSpeed, thresholds?.maxWindSpeed || 10);
      const clouds = this.evaluateCloudiness(forecast.cloudiness, thresholds?.maxCloudiness || 100);
      const rain = this.evaluateRain(forecast.rain, thresholds?.maxRain || 5);

      // Count as good if all conditions are at least caution-level
      if (wind.status !== 'bad' && clouds.status !== 'bad' && rain.status !== 'bad') {
        goodHours++;
      } else {
        break;
      }
    }

    if (goodHours >= 4) {
      return `Next ${goodHours}-${goodHours + 2} hours`;
    }

    return undefined;
  }

  /**
   * Combine multiple evaluations into final status
   * 
   * Logic: Any 'bad' evaluation results in 'bad' overall.
   * If no 'bad', but any 'caution', result is 'caution'.
   * Only 'good' if all evaluations are 'good'.
   * 
   * This ensures that if wind, clouds, OR rain is 'bad',
   * the activity status will be 'bad'.
   */
  static combineStatuses(
    evaluations: Array<{ status: ActivityStatus; severity: number }>
  ): ActivityStatus {
    const hasBad = evaluations.some(e => e.status === 'bad');
    if (hasBad) return 'bad';

    const hasCaution = evaluations.some(e => e.status === 'caution');
    if (hasCaution) return 'caution';

    return 'good';
  }

  /**
   * Generate human-readable reason
   */
  static generateReason(
    context: RuleContext,
    evaluations: {
      wind: { status: ActivityStatus; severity: number };
      clouds: { status: ActivityStatus; severity: number };
      rain: { status: ActivityStatus; severity: number };
      tide: { status: ActivityStatus; nextPreferredTime?: string };
    }
  ): string {
    const reasons: string[] = [];

    if (evaluations.wind.status === 'bad') {
      reasons.push(`wind is too strong (${context.weather.windSpeed.toFixed(1)} m/s)`);
    } else if (evaluations.wind.status === 'caution') {
      reasons.push(`wind is getting strong`);
    } else {
      reasons.push(`wind is calm`);
    }

    if (evaluations.clouds.status === 'bad') {
      reasons.push(`too cloudy (${context.weather.cloudiness}%)`);
    } else if (evaluations.clouds.status === 'good') {
      reasons.push(`clear skies`);
    }

    if (evaluations.rain.status === 'bad') {
      reasons.push(`heavy rain expected`);
    } else if (evaluations.rain.status === 'caution') {
      reasons.push(`light rain possible`);
    } else {
      reasons.push(`no rain`);
    }

    // Combine into readable sentence
    if (reasons.length === 3) {
      return `Conditions are ${evaluations.wind.status === 'good' && evaluations.clouds.status === 'good' && evaluations.rain.status === 'good' ? 'perfect' : 'acceptable'}. ${reasons[0]}, ${reasons[1]}, and ${reasons[2]}.`;
    }

    return reasons.join('. ') + '.';
  }
}

