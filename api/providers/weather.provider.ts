import type { WeatherData, HourlyForecast, ProviderError } from '../types/index.js';

interface OpenWeatherResponse {
  current: {
    wind_speed: number;
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    dt: number;
  };
  hourly?: Array<{
    dt: number;
    wind_speed: number;
    clouds: number;
    rain?: {
      '1h'?: number;
    };
  }>;
}

interface WeatherProviderResult {
  data: WeatherData;
  hourly?: HourlyForecast[];
  error?: ProviderError;
}

/**
 * Weather provider for OpenWeather One Call API
 * Normalizes external API response to internal model
 */
export class WeatherProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/3.0/onecall';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENWEATHER_API_KEY || '';
  }

  /**
   * Fetch current weather and hourly forecast for given coordinates
   */
  async fetchWeather(
    latitude: number,
    longitude: number
  ): Promise<WeatherProviderResult> {
    // If no API key, return mock data
    if (!this.apiKey) {
      console.warn('OpenWeather API key not found. Using mock data.');
      return this.getMockWeather();
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.set('appid', this.apiKey);
      url.searchParams.set('units', 'metric');
      url.searchParams.set('exclude', 'minutely,daily,alerts');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
      }

      const rawData: OpenWeatherResponse = await response.json();

      // Normalize to internal model
      const normalized: WeatherData = {
        windSpeed: rawData.current.wind_speed,
        cloudiness: rawData.current.clouds,
        rain: rawData.current.rain?.['1h'] || 0,
        timestamp: new Date(rawData.current.dt * 1000).toISOString(),
      };

      // Normalize hourly forecast if available
      const hourly: HourlyForecast[] | undefined = rawData.hourly?.slice(0, 24).map(hour => ({
        time: new Date(hour.dt * 1000).toISOString(),
        windSpeed: hour.wind_speed,
        rain: hour.rain?.['1h'] || 0,
        cloudiness: hour.clouds,
      }));

      return {
        data: normalized,
        hourly,
      };
    } catch (error) {
      console.error('Weather provider error:', error);
      
      // Return mock data on failure
      const mockData = this.getMockWeather();
      return {
        ...mockData,
        error: {
          provider: 'weather',
          message: error instanceof Error ? error.message : 'Unknown error',
          fallbackUsed: true,
        },
      };
    }
  }

  /**
   * Mock weather data fallback
   */
  private getMockWeather(): WeatherProviderResult {
    const now = new Date();
    const hour = now.getHours();
    
    // Simulate realistic weather patterns
    const baseWindSpeed = 5 + Math.sin((hour / 24) * Math.PI * 2) * 3;
    const baseCloudiness = 30 + Math.random() * 20;
    const baseRain = hour >= 14 && hour <= 18 ? Math.random() * 2 : 0;

    const mockHourly: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
      const forecastHour = (hour + i) % 24;
      return {
        time: new Date(now.getTime() + i * 60 * 60 * 1000).toISOString(),
        windSpeed: baseWindSpeed + Math.random() * 2 - 1,
        rain: forecastHour >= 14 && forecastHour <= 18 ? Math.random() * 1.5 : 0,
        cloudiness: baseCloudiness + Math.random() * 10 - 5,
      };
    });

    return {
      data: {
        windSpeed: baseWindSpeed,
        cloudiness: baseCloudiness,
        rain: baseRain,
        timestamp: now.toISOString(),
      },
      hourly: mockHourly,
    };
  }
}

