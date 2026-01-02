import type { ActivityRecommendation } from '../types/activity.js';
import type { RuleContext } from './base.rules.js';
import { BaseRules } from './base.rules.js';

/**
 * Snorkeling rules engine
 * 
 * REAL-WORLD LOGIC:
 * - Wind is KING (creates surface chop = poor visibility and safety risk)
 * - Tide matters for visibility (low tide often better)
 * - Clouds affect light but NOT safety (75% clouds ≠ bad snorkeling)
 * - Clouds can downgrade GOOD → CAUTION, but NEVER block GOOD → BAD
 * 
 * Golden rule: Calm sea (low wind) = safe snorkeling, even with clouds
 */
export function evaluateSnorkeling(context: RuleContext): ActivityRecommendation {
  const { weather, tides, hourlyForecast, thresholds } = context;

  // Evaluate conditions
  const windEval = BaseRules.evaluateWind(weather.windSpeed, thresholds.maxWindSpeed);
  const cloudsEval = BaseRules.evaluateCloudiness(weather.cloudiness, thresholds.maxCloudiness);
  const rainEval = BaseRules.evaluateRain(weather.rain, thresholds.maxRain);
  const tideEval = BaseRules.evaluateTide(tides, thresholds.preferredTide);

  // SNORKELING LOGIC: Wind determines safety, clouds only affect quality
  let finalStatus: typeof windEval.status;
  
  // Wind is the primary safety factor
  if (windEval.status === 'bad') {
    finalStatus = 'bad'; // Too windy = unsafe + poor visibility
  } else if (windEval.status === 'caution') {
    // Moderate wind + other bad factors = bad
    if (rainEval.status === 'bad') {
      finalStatus = 'bad'; // Moderate wind + heavy rain = unsafe
    } else {
      finalStatus = 'caution'; // Moderate wind is manageable but visibility reduced
    }
  } else {
    // Wind is good - snorkeling is SAFE
    // Heavy rain can downgrade to caution
    if (rainEval.status === 'bad') {
      finalStatus = 'caution'; // Heavy rain uncomfortable but safe if calm
    } else if (cloudsEval.status === 'bad') {
      // CRITICAL: Clouds can ONLY downgrade good → caution, NEVER block
      // If wind is good, sea is calm = safe snorkeling, just less light
      finalStatus = 'caution'; // Calm sea but cloudy = reduced visibility, still safe
    } else {
      finalStatus = 'good'; // Calm wind = good snorkeling conditions
    }
  }

  // Tide preference can further refine
  if (finalStatus === 'good' && tideEval.status === 'bad') {
    finalStatus = 'caution'; // Good conditions but not ideal tide timing
  }

  // Generate human-readable reason - prioritize wind, mention clouds contextually
  let reason: string;
  if (finalStatus === 'good') {
    if (tideEval.status === 'good') {
      if (cloudsEval.status === 'good') {
        reason = 'Perfect conditions for snorkeling. Calm waters, clear skies, and excellent visibility.';
      } else {
        reason = 'Excellent conditions for snorkeling. Calm waters provide good visibility, though skies are cloudy.';
      }
    } else {
      reason = 'Good conditions for snorkeling. Calm sea makes for safe snorkeling with good visibility.';
    }
  } else if (finalStatus === 'caution') {
    if (windEval.status === 'caution') {
      reason = `Moderate wind (${weather.windSpeed.toFixed(1)} m/s) will create some surface chop. Visibility may be reduced, but snorkeling is still possible.`;
    } else if (windEval.status === 'good' && cloudsEval.status === 'bad') {
      // This is the key case: calm sea but cloudy
      reason = `Sea is calm, making snorkeling safe. Cloudy skies reduce light and color vibrancy, but visibility underwater is still good.`;
    } else if (rainEval.status === 'bad') {
      reason = 'Heavy rain expected, but sea is calm. Snorkeling is safe but may be less comfortable.';
    } else if (tideEval.status === 'bad') {
      reason = 'Conditions are good, but low tide (better visibility) is coming soon. Still excellent for snorkeling right now.';
    } else {
      reason = 'Conditions are acceptable for snorkeling. Visibility may not be optimal, but still good.';
    }
  } else {
    // Bad status - wind or heavy rain is the problem
    if (windEval.status === 'bad') {
      reason = `Wind is too strong (${weather.windSpeed.toFixed(1)} m/s) for safe snorkeling. Water will be choppy with poor visibility. Wait for calmer conditions.`;
    } else if (rainEval.status === 'bad') {
      reason = 'Heavy rain expected. Conditions will be unsafe with poor visibility. Wait for better weather.';
    } else {
      reason = 'Poor conditions for snorkeling. Wait for calmer sea conditions.';
    }
  }

  // Calculate ideal window
  const window = BaseRules.calculateWindow(hourlyForecast, thresholds, 0, 6);

  return {
    status: finalStatus,
    reason,
    window: window || (finalStatus === 'good' ? 'Next 4-6 hours' : undefined),
  };
}
