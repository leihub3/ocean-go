/**
 * Normalized data models for backend
 * These hide external API implementation details
 */

export interface WeatherData {
  windSpeed: number; // m/s
  windDirection?: number; // degrees (0-360, 0 = North)
  cloudiness: number; // 0-100 percentage
  rain: number; // mm (0 if no rain)
  temperature?: number; // Celsius
  pressure?: number; // hPa
  humidity?: number; // percentage 0-100
  timestamp: string; // ISO string
}

export interface TideData {
  type: 'high' | 'low';
  height: number; // meters
  time: string; // ISO string
}

export interface HourlyForecast {
  time: string; // ISO string
  windSpeed: number; // m/s
  windDirection?: number; // degrees (0-360, 0 = North)
  rain: number; // mm
  cloudiness: number; // 0-100
  temperature?: number; // Celsius
  pressure?: number; // hPa
  humidity?: number; // percentage 0-100
  tideHeight?: number; // meters (optional, only if available from API)
}

export interface ProviderError {
  provider: string;
  message: string;
  fallbackUsed: boolean;
}

