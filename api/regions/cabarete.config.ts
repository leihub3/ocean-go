import type { RegionConfig } from '../types/region.js';

/**
 * Cabarete region configuration
 * Coordinates for the Cabarete beach area, Dominican Republic
 */
export const cabareteConfig: RegionConfig = {
  id: 'cabarete',
  name: 'Cabarete',
  displayName: 'Cabarete, DR',
  coordinates: {
    latitude: 19.7495,
    longitude: -70.4083,
  },
  // Activity-specific thresholds
  thresholds: {
    snorkeling: {
      maxWindSpeed: 6,      // m/s - calm conditions preferred
      maxCloudiness: 40,    // % - better visibility with less clouds
      maxRain: 0.5,         // mm - no significant rain
      preferredTide: 'low', // Low tide = better visibility
    },
    kayaking: {
      maxWindSpeed: 10,     // m/s - can handle moderate wind
      maxCloudiness: 70,    // % - less sensitive to clouds
      maxRain: 2,           // mm - light rain acceptable
      preferredTide: null,  // No strong preference
    },
    sup: {
      maxWindSpeed: 8,      // m/s - SUP is very wind-sensitive
      maxCloudiness: 60,    // % - moderate sensitivity
      maxRain: 1,           // mm - prefer dry conditions
      preferredTide: null,  // No strong preference
    },
    fishing: {
      maxWindSpeed: 12,     // m/s - can handle more wind
      maxCloudiness: 80,    // % - least sensitive
      maxRain: 5,           // mm - can fish in light rain
      preferredTide: 'high', // High tide = more fish activity
    },
  },
};

