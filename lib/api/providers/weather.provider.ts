import type { WeatherData, HourlyForecast, ProviderError } from '../types/index.js';

interface OpenWeatherResponse {
  current: {
    wind_speed: number;
    wind_deg?: number; // Wind direction in degrees (0-360, 0 = North)
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    temp?: number; // Celsius
    pressure?: number; // hPa
    humidity?: number; // percentage 0-100
    dt: number;
  };
  hourly?: Array<{
    dt: number;
    wind_speed: number;
    wind_deg?: number; // Wind direction in degrees (0-360, 0 = North)
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    temp?: number; // Celsius
    pressure?: number; // hPa
    humidity?: number; // percentage 0-100
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
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('[WeatherProvider] API key not found. Using mock data.');
      return this.getMockWeather();
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.set('appid', this.apiKey);
      url.searchParams.set('units', 'metric');
      url.searchParams.set('exclude', 'minutely,daily,alerts');

      // Add timeout to fetch request (15 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('OpenWeather API request timeout (15s)');
        }
        throw error;
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json() as OpenWeatherResponse;

      // Normalize to internal model
      const normalized: WeatherData = {
        windSpeed: rawData.current.wind_speed,
        windDirection: rawData.current.wind_deg,
        cloudiness: rawData.current.clouds,
        rain: rawData.current.rain?.['1h'] || 0,
        temperature: rawData.current.temp,
        pressure: rawData.current.pressure,
        humidity: rawData.current.humidity,
        timestamp: new Date(rawData.current.dt * 1000).toISOString(),
      };

      // Normalize hourly forecast if available
      const hourly: HourlyForecast[] | undefined = rawData.hourly?.slice(0, 24).map(hour => ({
        time: new Date(hour.dt * 1000).toISOString(),
        windSpeed: hour.wind_speed,
        windDirection: hour.wind_deg,
        rain: hour.rain?.['1h'] || 0,
        cloudiness: hour.clouds,
        temperature: hour.temp,
        pressure: hour.pressure,
        humidity: hour.humidity,
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
    
    // Simulate realistic weather patterns - using lower, more realistic wind speeds
    // Base wind between 2-4 m/s (calm to light breeze), matching typical Caribbean conditions
    const baseWindSpeed = 3 + Math.sin((hour / 24) * Math.PI * 2) * 1; // 2-4 m/s range
    const baseCloudiness = 40 + Math.random() * 30; // 40-70% typical
    const baseRain = hour >= 14 && hour <= 18 ? Math.random() * 0.5 : 0; // Light rain if any
    // Caribbean temperature: 25-30°C typical
    const baseTemp = 27 + Math.sin((hour / 24) * Math.PI * 2) * 2; // 25-29°C range
    // Typical Caribbean pressure: 1010-1015 hPa
    const basePressure = 1012 + Math.random() * 3; // 1012-1015 hPa
    // Typical Caribbean humidity: 60-80%
    const baseHumidity = 70 + Math.random() * 10; // 70-80% range

    // Typical Caribbean wind direction: Trade winds from E/SE (90-135°)
    const baseWindDir = 110 + Math.random() * 25; // 110-135° (E-SE)

    const mockHourly: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
      const forecastHour = (hour + i) % 24;
      // Hourly variation: slightly different from current but similar
      const hourWindSpeed = baseWindSpeed + (Math.random() * 2 - 1) * 0.5; // ±0.5 m/s variation
      const hourTemp = baseTemp + Math.sin((forecastHour / 24) * Math.PI * 2) * 2 + (Math.random() - 0.5) * 1;
      const hourPressure = basePressure + (Math.random() - 0.5) * 2;
      const hourHumidity = baseHumidity + (Math.random() - 0.5) * 10;
      // Wind direction varies slightly (±15 degrees)
      const hourWindDir = Math.round((baseWindDir + (Math.random() - 0.5) * 30) % 360);
      return {
        time: new Date(now.getTime() + i * 60 * 60 * 1000).toISOString(),
        windSpeed: Math.max(0.5, hourWindSpeed), // Ensure positive
        windDirection: hourWindDir,
        rain: forecastHour >= 14 && forecastHour <= 18 ? Math.random() * 0.3 : 0,
        cloudiness: Math.max(0, Math.min(100, baseCloudiness + Math.random() * 10 - 5)),
        temperature: Math.round((hourTemp) * 10) / 10, // Round to 1 decimal
        pressure: Math.round(hourPressure),
        humidity: Math.round(hourHumidity),
      };
    });

    return {
      data: {
        windSpeed: Math.max(0.5, baseWindSpeed), // Ensure positive
        windDirection: Math.round(baseWindDir),
        cloudiness: Math.max(0, Math.min(100, baseCloudiness)),
        rain: Math.max(0, baseRain),
        temperature: Math.round(baseTemp * 10) / 10,
        pressure: Math.round(basePressure),
        humidity: Math.round(baseHumidity),
        timestamp: now.toISOString(),
      },
      hourly: mockHourly,
    };
  }
}

