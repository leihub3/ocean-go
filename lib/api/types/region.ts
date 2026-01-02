import type { ActivityType } from '../types/activity.js';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ActivityThresholds {
  maxWindSpeed: number; // m/s
  maxCloudiness: number; // percentage 0-100
  maxRain: number; // mm
  preferredTide: 'high' | 'low' | null;
}

export interface RegionConfig {
  id: string;
  name: string;
  displayName: string;
  coordinates: Coordinates;
  thresholds: Record<ActivityType, ActivityThresholds>;
}

