/**
 * Normalized data models for backend
 * These hide external API implementation details
 */

export interface WeatherData {
  windSpeed: number; // m/s
  cloudiness: number; // 0-100 percentage
  rain: number; // mm (0 if no rain)
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
  rain: number; // mm
  cloudiness: number; // 0-100
}

export interface ProviderError {
  provider: string;
  message: string;
  fallbackUsed: boolean;
}

