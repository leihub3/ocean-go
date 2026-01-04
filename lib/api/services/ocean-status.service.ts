import type { RegionConfig } from '../types/region.js';
import type { ActivityType, ActivityRecommendation } from '../types/activity.js';
import type { WeatherData, TideData, HourlyForecast, ProviderError } from '../types/index.js';
import { WeatherProvider } from '../providers/weather.provider.js';
import { TidesProvider } from '../providers/tides.provider.js';
import { evaluateSnorkeling } from '../rules/snorkel.rules.js';
import { evaluateKayaking } from '../rules/kayak.rules.js';
import { evaluateSUP } from '../rules/sup.rules.js';
import { evaluateFishing } from '../rules/fishing.rules.js';

export interface CurrentConditions {
  weather: WeatherData;
  currentTide: TideData | null;
  nextTide: TideData | null;
  hourlyForecast?: HourlyForecast[];
}

export interface OceanStatusResponse {
  region: string;
  timestamp: string;
  activities: Record<ActivityType, ActivityRecommendation>;
  conditions?: CurrentConditions;
  hourlyForecast?: HourlyForecast[];
  errors?: ProviderError[];
}

/**
 * Ocean status service that orchestrates providers and rules
 */
export class OceanStatusService {
  private weatherProvider: WeatherProvider;
  private tidesProvider: TidesProvider;

  constructor() {
    this.weatherProvider = new WeatherProvider();
    this.tidesProvider = new TidesProvider();
  }

  /**
   * Get ocean status for a region
   */
  async getOceanStatus(regionConfig: RegionConfig): Promise<OceanStatusResponse> {
    const { coordinates, name } = regionConfig;

    // Fetch data from providers in parallel
    const [weatherResult, tidesResult] = await Promise.all([
      this.weatherProvider.fetchWeather(coordinates.latitude, coordinates.longitude),
      this.tidesProvider.fetchTides(coordinates.latitude, coordinates.longitude, 3),
    ]);

    // Collect any provider errors
    const errors: ProviderError[] = [];
    if (weatherResult.error) {
      errors.push(weatherResult.error);
    }
    if (tidesResult.error) {
      errors.push(tidesResult.error);
    }

    // Evaluate each activity using its specific rules
    // Each activity needs its own thresholds
    const activities: Record<ActivityType, ActivityRecommendation> = {
      snorkeling: evaluateSnorkeling({
        weather: weatherResult.data,
        tides: tidesResult.data,
        hourlyForecast: weatherResult.hourly,
        thresholds: regionConfig.thresholds.snorkeling,
      }),
      kayaking: evaluateKayaking({
        weather: weatherResult.data,
        tides: tidesResult.data,
        hourlyForecast: weatherResult.hourly,
        thresholds: regionConfig.thresholds.kayaking,
      }),
      sup: evaluateSUP({
        weather: weatherResult.data,
        tides: tidesResult.data,
        hourlyForecast: weatherResult.hourly,
        thresholds: regionConfig.thresholds.sup,
      }),
      fishing: evaluateFishing({
        weather: weatherResult.data,
        tides: tidesResult.data,
        hourlyForecast: weatherResult.hourly,
        thresholds: regionConfig.thresholds.fishing,
      }),
    };

    // Determine current and next tide
    const now = new Date();
    const currentTide = tidesResult.data.find(
      tide => new Date(tide.time) <= now && 
      new Date(tide.time).getTime() > now.getTime() - 3 * 60 * 60 * 1000 // Within last 3 hours
    ) || null;

    const nextTide = tidesResult.data.find(
      tide => new Date(tide.time) > now
    ) || null;

    // Merge hourly forecast with tide heights if available
    let mergedHourlyForecast = weatherResult.hourly;
    if (weatherResult.hourly && tidesResult.hourlyHeights && tidesResult.hourlyHeights.length > 0) {
      mergedHourlyForecast = weatherResult.hourly.map(hour => {
        const hourTime = new Date(hour.time);
        // Find the closest tide height (within 30 minutes)
        const closestTide = tidesResult.hourlyHeights?.reduce((closest, tide) => {
          if (!closest) return tide;
          const tideTime = new Date(tide.time);
          const closestTime = new Date(closest.time);
          const tideDiff = Math.abs(hourTime.getTime() - tideTime.getTime());
          const closestDiff = Math.abs(hourTime.getTime() - closestTime.getTime());
          return tideDiff < closestDiff ? tide : closest;
        });
        
        // Only include if within 30 minutes
        if (closestTide) {
          const timeDiff = Math.abs(hourTime.getTime() - new Date(closestTide.time).getTime());
          if (timeDiff <= 30 * 60 * 1000) {
            return {
              ...hour,
              tideHeight: Number(closestTide.height.toFixed(2)),
            };
          }
        }
        return hour;
      });
    }

    // If current weather has windSpeed = 0, use first hourly forecast as fallback
    // This handles cases where the API returns 0 but hourly forecast has valid data
    let currentWeather = weatherResult.data;
    if (currentWeather.windSpeed === 0 && mergedHourlyForecast && mergedHourlyForecast.length > 0) {
      const firstForecast = mergedHourlyForecast[0];
      if (firstForecast && firstForecast.windSpeed > 0) {
        // Use first forecast hour as current weather if it's within 1 hour
        const now = new Date();
        const firstForecastTime = new Date(firstForecast.time);
        const timeDiff = Math.abs(now.getTime() - firstForecastTime.getTime());
        const oneHour = 60 * 60 * 1000;
        
        if (timeDiff <= oneHour) {
          currentWeather = {
            ...currentWeather,
            windSpeed: firstForecast.windSpeed,
            windDirection: firstForecast.windDirection ?? currentWeather.windDirection,
            cloudiness: firstForecast.cloudiness ?? currentWeather.cloudiness,
            rain: firstForecast.rain ?? currentWeather.rain,
            temperature: firstForecast.temperature ?? currentWeather.temperature,
            pressure: firstForecast.pressure ?? currentWeather.pressure,
            humidity: firstForecast.humidity ?? currentWeather.humidity,
          };
        }
      }
    }

    // Build conditions object
    const conditions: CurrentConditions = {
      weather: currentWeather,
      currentTide,
      nextTide,
      hourlyForecast: mergedHourlyForecast,
    };

    return {
      region: name,
      timestamp: new Date().toISOString(),
      activities,
      conditions,
      hourlyForecast: mergedHourlyForecast, // Also at top level for convenience
      ...(errors.length > 0 && { errors }),
    };
  }
}

