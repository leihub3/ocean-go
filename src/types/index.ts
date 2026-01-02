export type ActivityStatus = "good" | "caution" | "bad";

export interface ActivityRecommendation {
  status: ActivityStatus;
  reason: string;
  window?: string;
}

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

export interface CurrentConditions {
  weather: WeatherData;
  currentTide: TideData | null;
  nextTide: TideData | null;
  hourlyForecast?: HourlyForecast[];
}

export interface ProviderError {
  provider: string;
  message: string;
  fallbackUsed: boolean;
}

export interface OceanGoResponse {
  region: string;
  timestamp: string;
  activities: Record<string, ActivityRecommendation>;
  conditions?: CurrentConditions;
  errors?: ProviderError[];
  hourlyForecast?: HourlyForecast[];
}

export type ActivityType = "snorkeling" | "kayaking" | "sup" | "fishing";

export interface Region {
  id: string;
  name: string;
  displayName: string;
}

