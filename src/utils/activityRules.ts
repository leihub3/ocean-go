import type { ActivityType, HourlyForecast, ActivityStatus } from '../types';

/**
 * Activity thresholds - matching backend configs
 * In the future, these could come from the API response
 */
export const ACTIVITY_THRESHOLDS: Record<ActivityType, {
  maxWindSpeed: number;
  maxCloudiness: number;
  maxRain: number;
  preferredTide: 'high' | 'low' | null;
}> = {
  snorkeling: {
    maxWindSpeed: 6,
    maxCloudiness: 40,
    maxRain: 0.5,
    preferredTide: 'low',
  },
  kayaking: {
    maxWindSpeed: 10,
    maxCloudiness: 70,
    maxRain: 2,
    preferredTide: null,
  },
  sup: {
    maxWindSpeed: 8,
    maxCloudiness: 60,
    maxRain: 1,
    preferredTide: null,
  },
  fishing: {
    maxWindSpeed: 12,
    maxCloudiness: 80,
    maxRain: 5,
    preferredTide: 'high',
  },
};

/**
 * Evaluate wind conditions based on activity-specific thresholds
 */
function evaluateWind(windSpeed: number, maxWindSpeed: number): ActivityStatus {
  if (windSpeed <= maxWindSpeed * 0.7) return 'good';
  if (windSpeed <= maxWindSpeed) return 'caution';
  return 'bad';
}

/**
 * Evaluate cloudiness (for snorkeling only - others ignore)
 */
function evaluateCloudiness(cloudiness: number, maxCloudiness: number): ActivityStatus {
  if (cloudiness <= maxCloudiness * 0.6) return 'good';
  if (cloudiness <= maxCloudiness) return 'caution';
  return 'bad';
}

/**
 * Evaluate rain conditions
 */
function evaluateRain(rain: number, maxRain: number): ActivityStatus {
  if (rain === 0) return 'good';
  if (rain <= maxRain * 0.5) return 'caution';
  return 'bad';
}

/**
 * Get activity-specific status for an hour based on new rules engine logic
 */
export function getActivityStatusForHour(
  hour: HourlyForecast,
  activityType: ActivityType
): ActivityStatus {
  const thresholds = ACTIVITY_THRESHOLDS[activityType];
  const windEval = evaluateWind(hour.windSpeed, thresholds.maxWindSpeed);
  const rainEval = evaluateRain(hour.rain, thresholds.maxRain);

  // Apply activity-specific logic matching backend rules

  if (activityType === 'kayaking' || activityType === 'sup') {
    // Wind is the ONLY blocking factor for kayaking/SUP
    if (windEval === 'bad') return 'bad';
    if (windEval === 'caution') {
      return rainEval === 'bad' ? 'bad' : 'caution';
    }
    // Wind is good
    return rainEval === 'bad' ? 'caution' : 'good';
  }

  if (activityType === 'snorkeling') {
    // Wind determines safety, clouds only downgrade
    if (windEval === 'bad') return 'bad';
    if (windEval === 'caution') {
      return rainEval === 'bad' ? 'bad' : 'caution';
    }
    // Wind is good - snorkeling is safe
    if (rainEval === 'bad') return 'caution';
    const cloudsEval = evaluateCloudiness(hour.cloudiness, thresholds.maxCloudiness);
    if (cloudsEval === 'bad') return 'caution'; // Clouds downgrade but don't block
    return 'good';
  }

  if (activityType === 'fishing') {
    // Fishing logic is more complex (tide-dependent), but for hourly forecast:
    // Wind matters but not blocking unless extreme
    if (windEval === 'bad') {
      // Bad wind can make fishing challenging
      return 'caution';
    }
    if (windEval === 'caution') {
      return 'caution';
    }
    // Good wind
    return rainEval === 'bad' ? 'caution' : 'good';
  }

  // Default fallback
  return 'good';
}

