import type { RegionConfig } from '../types/region.js';

/**
 * Bayahibe / Dominicus region configuration
 * Coordinates for the Dominican Republic beach area
 */
export const bayahibeConfig: RegionConfig = {
  id: 'bayahibe-dominicus',
  name: 'Bayahibe / Dominicus',
  displayName: 'Bayahibe / Dominicus, DR',
  coordinates: {
    latitude: 18.3736,  // Bayahibe coordinates
    longitude: -68.8339,
  },
  // Activity-specific thresholds
  // NOTE: Cloudiness thresholds are informational only - clouds do not block activities
  // Wind is the primary safety factor for water activities
  thresholds: {
    snorkeling: {
      maxWindSpeed: 6,      // m/s - calm conditions for good visibility (PRIMARY FACTOR)
      maxCloudiness: 40,    // % - informational only (clouds don't block, only affect light)
      maxRain: 0.5,         // mm - heavy rain affects visibility
      preferredTide: 'low', // Low tide = better visibility underwater
    },
    kayaking: {
      maxWindSpeed: 10,     // m/s - PRIMARY FACTOR (wind creates chop, affects safety)
      maxCloudiness: 70,    // % - IRRELEVANT (clouds don't affect kayaking)
      maxRain: 2,           // mm - heavy rain is uncomfortable
      preferredTide: null,  // No strong preference
    },
    sup: {
      maxWindSpeed: 8,      // m/s - PRIMARY FACTOR (most wind-sensitive activity)
      maxCloudiness: 60,    // % - IRRELEVANT (clouds don't affect SUP)
      maxRain: 1,           // mm - heavy rain affects visibility/comfort
      preferredTide: null,  // No strong preference
    },
    fishing: {
      maxWindSpeed: 12,     // m/s - matters but not blocking (unless extreme)
      maxCloudiness: 80,    // % - can be POSITIVE (clouds reduce glare, fish stay active)
      maxRain: 5,           // mm - fish don't care about rain
      preferredTide: 'high', // PRIMARY FACTOR - tide timing determines fish activity
    },
  },
};

