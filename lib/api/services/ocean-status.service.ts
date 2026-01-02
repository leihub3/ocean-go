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
      this.tidesProvider.fetchTides(coordinates.latitude, coordinates.longitude, 2),
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

    // Build conditions object
    const conditions: CurrentConditions = {
      weather: weatherResult.data,
      currentTide,
      nextTide,
      hourlyForecast: weatherResult.hourly,
    };

    return {
      region: name,
      timestamp: new Date().toISOString(),
      activities,
      conditions,
      hourlyForecast: weatherResult.hourly, // Also at top level for convenience
      ...(errors.length > 0 && { errors }),
    };
  }
}

