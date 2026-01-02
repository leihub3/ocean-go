import type { ActivityRecommendation } from '../types/activity.js';
import type { RuleContext } from './base.rules.js';
import { BaseRules } from './base.rules.js';

/**
 * Kayaking rules engine
 * 
 * REAL-WORLD LOGIC:
 * - Wind is the ONLY blocking factor (creates chop, makes paddling unsafe)
 * - Clouds are IRRELEVANT (don't affect water conditions or safety)
 * - Rain only matters if heavy (light rain is fine)
 * - Tide is context but not blocking
 * 
 * Golden rule: If the sea is calm (low wind), kayaking is safe regardless of clouds
 */
export function evaluateKayaking(context: RuleContext): ActivityRecommendation {
  const { weather, hourlyForecast, thresholds } = context;

  // Evaluate conditions
  const windEval = BaseRules.evaluateWind(weather.windSpeed, thresholds.maxWindSpeed);
  const rainEval = BaseRules.evaluateRain(weather.rain, thresholds.maxRain);

  // KAYAKING LOGIC: Wind is king, everything else is secondary
  let finalStatus: typeof windEval.status = windEval.status;
  
  // Wind alone determines if kayaking is safe
  if (windEval.status === 'bad') {
    finalStatus = 'bad'; // Too windy = unsafe, regardless of other factors
  } else if (windEval.status === 'caution') {
    // Moderate wind + heavy rain = bad
    if (rainEval.status === 'bad') {
      finalStatus = 'bad';
    } else {
      finalStatus = 'caution'; // Moderate wind is manageable
    }
  } else {
    // Wind is good - kayaking is safe
    // Heavy rain can downgrade, but wind being good means sea is calm
    if (rainEval.status === 'bad') {
      finalStatus = 'caution'; // Heavy rain is uncomfortable but not unsafe if sea is calm
    } else {
      finalStatus = 'good'; // Calm wind = good kayaking conditions
    }
  }

  // Generate human-readable reason - NEVER mention clouds as blocking factor
  let reason: string;
  if (finalStatus === 'good') {
    if (windEval.status === 'good' && rainEval.status === 'good') {
      reason = 'Excellent conditions for kayaking. Calm waters and light winds. Perfect time to go out.';
    } else {
      reason = 'Good conditions for kayaking. Calm sea makes paddling safe and enjoyable.';
    }
  } else if (finalStatus === 'caution') {
    if (windEval.status === 'caution') {
      reason = `Moderate wind (${weather.windSpeed.toFixed(1)} m/s). Experienced kayakers should be fine, but beginners should be cautious. Sea conditions are manageable.`;
    } else if (rainEval.status === 'bad') {
      reason = 'Heavy rain expected, but sea is calm. Conditions are safe but may be uncomfortable.';
    } else {
      reason = 'Conditions are acceptable for kayaking. Sea is manageable but not ideal.';
    }
  } else {
    // Bad status - wind is the problem
    reason = `Wind is too strong (${weather.windSpeed.toFixed(1)} m/s) for safe kayaking. Sea will be choppy. Wait for calmer conditions.`;
  }

  // Calculate ideal window
  const window = BaseRules.calculateWindow(hourlyForecast, thresholds, 0, 8);

  return {
    status: finalStatus,
    reason,
    window: window || (finalStatus === 'good' ? 'Next 6-8 hours' : undefined),
  };
}
