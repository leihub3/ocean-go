import type { ActivityRecommendation } from '../types/activity.js';
import type { RuleContext } from './base.rules.js';
import { BaseRules } from './base.rules.js';

/**
 * Fishing rules engine
 * 
 * REAL-WORLD LOGIC:
 * - Tide is KING for fishing (fish activity peaks during tide changes)
 * - Wind matters but is not blocking (unless extreme)
 * - Clouds can be POSITIVE (reduce glare, fish stay active longer)
 * - Rain is mostly fine (fish don't care, but heavy rain is uncomfortable)
 * 
 * Golden rule: Good tide timing + manageable wind = good fishing, regardless of clouds
 */
export function evaluateFishing(context: RuleContext): ActivityRecommendation {
  const { weather, tides, hourlyForecast, thresholds } = context;

  // Evaluate conditions
  const windEval = BaseRules.evaluateWind(weather.windSpeed, thresholds.maxWindSpeed);
  const rainEval = BaseRules.evaluateRain(weather.rain, thresholds.maxRain);
  const tideEval = BaseRules.evaluateTide(tides, thresholds.preferredTide);

  // FISHING LOGIC: Tide-first, wind-secondary, clouds irrelevant
  let finalStatus: typeof tideEval.status;
  
  // Start with tide evaluation (most important for fishing)
  if (tideEval.status === 'good') {
    // Good tide timing - fishing is favorable
    if (windEval.status === 'bad') {
      finalStatus = 'caution'; // Strong wind makes fishing harder but not impossible
    } else if (rainEval.status === 'bad') {
      finalStatus = 'caution'; // Heavy rain is uncomfortable but fish still bite
    } else {
      finalStatus = 'good'; // Good tide + manageable conditions = excellent fishing
    }
  } else if (tideEval.status === 'caution') {
    // Tide change coming soon - still good
    if (windEval.status === 'bad' || rainEval.status === 'bad') {
      finalStatus = 'caution'; // Conditions moderate but tide timing helps
    } else {
      finalStatus = 'good'; // Tide timing + good conditions = good fishing
    }
  } else {
    // Tide timing not ideal (bad status)
    if (windEval.status === 'bad') {
      finalStatus = 'bad'; // Bad tide + too windy = poor fishing
    } else if (windEval.status === 'caution' || rainEval.status === 'bad') {
      finalStatus = 'caution'; // Bad tide + moderate conditions = moderate fishing
    } else {
      finalStatus = 'caution'; // Bad tide but good conditions = moderate activity
    }
  }

  // Generate human-readable reason - focus on tide and wind, never blame clouds
  let reason: string;
  const nextHighTide = tides.find(t => t.type === 'high' && new Date(t.time) > new Date());
  const nextLowTide = tides.find(t => t.type === 'low' && new Date(t.time) > new Date());
  const preferredTideTime = thresholds.preferredTide === 'high' ? nextHighTide : nextLowTide;
  
  if (finalStatus === 'good') {
    if (tideEval.status === 'good' || tideEval.status === 'caution') {
      const hoursUntil = preferredTideTime 
        ? Math.round((new Date(preferredTideTime.time).getTime() - Date.now()) / (60 * 60 * 1000))
        : 0;
      
      if (hoursUntil <= 2 && hoursUntil > 0) {
        const tideType = thresholds.preferredTide === 'high' ? 'high tide' : 'low tide';
        reason = `Excellent fishing conditions. ${tideType.charAt(0).toUpperCase() + tideType.slice(1)} in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} - peak feeding activity expected.`;
      } else if (tideEval.status === 'good') {
        reason = `Great fishing conditions. Active feeding times with favorable tide and manageable weather.`;
      } else {
        reason = `Good fishing conditions. Tide timing is favorable with calm conditions.`;
      }
    } else {
      reason = 'Good fishing conditions. Calm weather makes for comfortable fishing.';
    }
  } else if (finalStatus === 'caution') {
    if (tideEval.status === 'bad') {
      const nextTideTime = preferredTideTime 
        ? new Date(preferredTideTime.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'later';
      const tideType = thresholds.preferredTide === 'high' ? 'high tide' : 'low tide';
      reason = `Fishing is possible, but activity is typically better during ${tideType}. Next ${tideType} at ${nextTideTime}.`;
    } else if (windEval.status === 'caution' || windEval.status === 'bad') {
      reason = `Fishing is possible, but wind (${weather.windSpeed.toFixed(1)} m/s) may make casting challenging. Tide timing is good though.`;
    } else if (rainEval.status === 'bad') {
      reason = 'Fishing is possible in heavy rain, but conditions will be uncomfortable. Fish are still active during good tide timing.';
    } else {
      reason = 'Fishing is possible, but conditions are moderate. Activity may vary.';
    }
  } else {
    // Bad status - poor conditions
    if (windEval.status === 'bad' && tideEval.status === 'bad') {
      const windKmh = (weather.windSpeed * 3.6).toFixed(1);
      reason = `Poor fishing conditions. Wind is too strong (${windKmh} km/h / ${weather.windSpeed.toFixed(1)} m/s) and tide timing is not ideal. Wait for better conditions.`;
    } else if (windEval.status === 'bad') {
      const windKmh = (weather.windSpeed * 3.6).toFixed(1);
      reason = `Wind is too strong (${windKmh} km/h / ${weather.windSpeed.toFixed(1)} m/s) for comfortable fishing. Wait for calmer conditions.`;
    } else {
      reason = 'Poor fishing conditions. Wait for better tide timing and calmer weather.';
    }
  }

  // Calculate ideal window (shorter for fishing due to tide cycles)
  const window = BaseRules.calculateWindow(hourlyForecast, thresholds, 0, 4);

  return {
    status: finalStatus,
    reason,
    window: window || (finalStatus === 'good' ? 'Next 2-3 hours' : undefined),
  };
}
