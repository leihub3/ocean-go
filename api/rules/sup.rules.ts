import type { ActivityRecommendation } from '../types/activity.js';
import type { RuleContext } from './base.rules.js';
import { BaseRules } from './base.rules.js';

/**
 * SUP (Stand Up Paddleboarding) rules engine
 * 
 * REAL-WORLD LOGIC:
 * - SUP is the MOST wind-sensitive activity
 * - Wind is the ONLY blocking factor (affects balance and safety)
 * - Clouds are COMPLETELY IRRELEVANT (zero impact on SUP)
 * - Rain only matters if it affects visibility/safety
 * 
 * Golden rule: If wind is low, SUP is possible. If wind is high, SUP is dangerous.
 */
export function evaluateSUP(context: RuleContext): ActivityRecommendation {
  const { weather, hourlyForecast, thresholds } = context;

  // Evaluate conditions - SUP only cares about wind and rain
  const windEval = BaseRules.evaluateWind(weather.windSpeed, thresholds.maxWindSpeed);
  const rainEval = BaseRules.evaluateRain(weather.rain, thresholds.maxRain);

  // SUP LOGIC: Wind determines everything
  let finalStatus: typeof windEval.status;
  
  if (windEval.status === 'bad') {
    finalStatus = 'bad'; // Too windy = unsafe for SUP, period
  } else if (windEval.status === 'caution') {
    // Moderate wind + heavy rain = bad
    if (rainEval.status === 'bad') {
      finalStatus = 'bad';
    } else {
      finalStatus = 'caution'; // Moderate wind requires experience
    }
  } else {
    // Wind is good - SUP is possible
    // Rain only downgrades, doesn't block
    if (rainEval.status === 'bad') {
      finalStatus = 'caution'; // Heavy rain uncomfortable but safe if calm
    } else {
      finalStatus = 'good'; // Calm wind = ideal SUP conditions
    }
  }

  // Generate human-readable reason - NEVER mention clouds
  let reason: string;
  if (finalStatus === 'good') {
    if (windEval.status === 'good') {
      reason = 'Perfect conditions for SUP. Calm waters and light winds. Ideal for paddling.';
    } else {
      reason = 'Good conditions for SUP. Calm sea makes paddling safe.';
    }
  } else if (finalStatus === 'caution') {
    if (windEval.status === 'caution') {
      reason = `Moderate wind (${weather.windSpeed.toFixed(1)} m/s). Good for experienced paddlers, but beginners should be cautious. Balance will be more challenging.`;
    } else if (rainEval.status === 'bad') {
      reason = 'Heavy rain expected, but wind is calm. Conditions are safe for experienced paddlers.';
    } else {
      reason = 'Conditions are acceptable for SUP. Requires experience and caution.';
    }
  } else {
    // Bad status - wind is the ONLY problem
    reason = `Too windy (${weather.windSpeed.toFixed(1)} m/s) for safe SUP. Water will be choppy and balance difficult. Wait for calmer conditions.`;
  }

  // Calculate ideal window (shorter for SUP - most sensitive)
  const window = BaseRules.calculateWindow(hourlyForecast, thresholds, 0, 5);

  return {
    status: finalStatus,
    reason,
    window: window || (finalStatus === 'good' ? 'Next 4-5 hours' : undefined),
  };
}
