import type { TideData, ProviderError } from '../types/index.js';

interface WorldTidesResponse {
  predictions?: Array<{
    t: string; // ISO timestamp
    v: number; // height in meters
    type: string; // "H" for high, "L" for low
  }>;
  extremes?: Array<{
    dt: number; // Unix timestamp
    date: string; // ISO date string
    height: number; // height in meters
    type: string; // "High" or "Low"
  }>;
  heights?: Array<{
    dt: number; // Unix timestamp
    date: string; // ISO date string
    height: number; // height in meters
  }>;
  status?: number;
  error?: string;
  callCount?: number;
  copyright?: string;
  requestLat?: number;
  requestLon?: number;
  responseLat?: number;
  responseLon?: number;
  atlas?: string;
  station?: string;
}

interface TidesProviderResult {
  data: TideData[];
  hourlyHeights?: Array<{
    time: string; // ISO string
    height: number; // meters
  }>;
  error?: ProviderError;
}

/**
 * Tides provider for WorldTides API
 * Normalizes external API response to internal model
 */
export class TidesProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.WORLDTIDES_API_KEY || '';
  }

  /**
   * Fetch current and upcoming tides for given coordinates
   * Returns next 48 hours of tide predictions
   */
  async fetchTides(
    latitude: number,
    longitude: number,
    days: number = 2
  ): Promise<TidesProviderResult> {
    // If no API key, return mock data
    if (!this.apiKey) {
      console.warn('WorldTides API key not found. Using mock data.');
      return this.getMockTides();
    }

    try {
      // WorldTides API v2 endpoint (v3 may not exist or have different structure)
      const url = new URL('https://www.worldtides.info/api/v2');
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.set('days', days.toString());
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('heights', '1'); // Request heights

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`WorldTides API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json() as WorldTidesResponse;

      if (rawData.error) {
        throw new Error(rawData.error);
      }

      // Normalize to internal model
      // WorldTides API v2 can return 'extremes' (explicit high/low tides) or 'heights' (all data points)
      let normalized: TideData[] = [];
      
      // Prefer extremes if available (explicit high/low tide predictions)
      if (rawData.extremes && rawData.extremes.length > 0) {
        normalized = rawData.extremes.map(extreme => ({
          type: extreme.type.toLowerCase() === 'high' ? 'high' : 'low',
          height: extreme.height,
          time: new Date(extreme.dt * 1000).toISOString(),
        }));
      } 
      // Fallback to predictions format if available
      else if (rawData.predictions && rawData.predictions.length > 0) {
        normalized = rawData.predictions.map(pred => ({
          type: pred.type === 'H' ? 'high' : 'low',
          height: pred.v,
          time: pred.t,
        }));
      }
      // Last resort: parse heights array to find peaks and troughs
      else if (rawData.heights && rawData.heights.length > 0) {
        const heights = rawData.heights;
        
        // Calculate average height to determine if a value is above/below average
        const avgHeight = heights.reduce((sum, h) => sum + h.height, 0) / heights.length;
        
        // Find peaks (high tides) and troughs (low tides) in the heights array
        // Use a window to identify true peaks/troughs
        for (let i = 2; i < heights.length - 2; i++) {
          const prev2 = heights[i - 2];
          const prev1 = heights[i - 1];
          const currHeight = heights[i];
          const next1 = heights[i + 1];
          const next2 = heights[i + 2];
          
          if (!prev2 || !prev1 || !currHeight || !next1 || !next2) continue;
          
          const window = [
            prev2.height,
            prev1.height,
            currHeight.height,
            next1.height,
            next2.height,
          ];
          
          const curr = currHeight.height;
          const maxInWindow = Math.max(...window);
          const minInWindow = Math.min(...window);
          
          // Local maximum = high tide (must be the highest in a 5-point window and above average)
          if (curr === maxInWindow && curr > avgHeight && curr > 0.3 && currHeight) {
            normalized.push({
              type: 'high',
              height: curr,
              time: new Date(currHeight.dt * 1000).toISOString(),
            });
          }
          // Local minimum = low tide (must be the lowest in a 5-point window and below average)
          else if (curr === minInWindow && curr < avgHeight && curr < 0.7 && currHeight) {
            normalized.push({
              type: 'low',
              height: curr,
              time: new Date(currHeight.dt * 1000).toISOString(),
            });
          }
        }
        
        // If we still didn't find enough tides, use a simpler approach
        if (normalized.length < 4) {
          normalized = [];
          for (let i = 1; i < heights.length - 1; i++) {
            const prevHeight = heights[i - 1];
            const currHeight = heights[i];
            const nextHeight = heights[i + 1];
            
            if (!prevHeight || !currHeight || !nextHeight) continue;
            
            const prev = prevHeight.height;
            const curr = currHeight.height;
            const next = nextHeight.height;
            
            // More lenient peak/trough detection
            if (curr > prev && curr > next && curr > 0.3) {
              normalized.push({
                type: 'high',
                height: curr,
                time: new Date(currHeight.dt * 1000).toISOString(),
              });
            } else if (curr < prev && curr < next && curr < 0.7) {
              normalized.push({
                type: 'low',
                height: curr,
                time: new Date(currHeight.dt * 1000).toISOString(),
              });
            }
          }
        }
      }
      
      // Sort by time to ensure chronological order
      normalized.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      
      // Remove duplicates (same time within 1 hour)
      const deduplicated: TideData[] = [];
      for (const tide of normalized) {
        const lastTide = deduplicated[deduplicated.length - 1];
        if (!lastTide || Math.abs(new Date(tide.time).getTime() - new Date(lastTide.time).getTime()) > 60 * 60 * 1000) {
          deduplicated.push(tide);
        }
      }
      normalized = deduplicated;

      // Extract hourly heights from the heights array if available
      let hourlyHeights: Array<{ time: string; height: number }> | undefined;
      if (rawData.heights && rawData.heights.length > 0) {
        hourlyHeights = rawData.heights.map(h => ({
          time: new Date(h.dt * 1000).toISOString(),
          height: h.height,
        }));
      }

      return {
        data: normalized,
        hourlyHeights,
      };
    } catch (error) {
      console.error('Tides provider error:', error);
      
      // Return mock data on failure
      const mockData = this.getMockTides();
      return {
        data: mockData.data,
        hourlyHeights: mockData.hourlyHeights,
        error: {
          provider: 'tides',
          message: error instanceof Error ? error.message : 'Unknown error',
          fallbackUsed: true,
        },
      };
    }
  }

  /**
   * Mock tides data fallback
   * Simulates realistic tide patterns (approximately 6-hour cycles)
   */
  private getMockTides(): TidesProviderResult {
    const now = new Date();
    const tides: TideData[] = [];
    
    // Start with a high or low tide approximately now
    const startIsHigh = Math.random() > 0.5;
    let currentTime = new Date(now);
    let isHigh = startIsHigh;

    // Generate 48 hours of tides (approximately 16 tide changes)
    for (let i = 0; i < 16; i++) {
      // Tides alternate roughly every 6 hours
      const hoursToAdd = 5.5 + Math.random() * 1; // 5.5-6.5 hours
      currentTime = new Date(currentTime.getTime() + hoursToAdd * 60 * 60 * 1000);
      
      isHigh = !isHigh;
      const height = isHigh 
        ? 0.7 + Math.random() * 0.5  // High: 0.7-1.2m
        : 0.1 + Math.random() * 0.4;  // Low: 0.1-0.5m

      tides.push({
        type: isHigh ? 'high' : 'low',
        height: Math.round(height * 100) / 100, // Round to 2 decimals
        time: currentTime.toISOString(),
      });
    }

    // Filter to only future tides
    const futureTides = tides.filter(tide => new Date(tide.time) > now);

    // Generate hourly mock heights using sinusoidal interpolation
    const hourlyHeights: Array<{ time: string; height: number }> = [];
    const startHeight = startIsHigh ? 0.8 : 0.3;
    let mockTime = new Date(now);
    
    for (let hour = 0; hour < 48; hour++) {
      // Simple sinusoidal pattern: 6-hour cycle
      const cyclePosition = (hour % 12) / 12; // 0 to 1 over 12 hours (2 cycles per day)
      const sineValue = Math.sin(cyclePosition * Math.PI * 2);
      // Normalize to realistic height range (0.1 to 1.0 meters)
      const height = 0.55 + sineValue * 0.45; // Center at 0.55, range ±0.45
      
      hourlyHeights.push({
        time: mockTime.toISOString(),
        height: Math.round(height * 100) / 100,
      });
      
      mockTime = new Date(mockTime.getTime() + 60 * 60 * 1000); // Add 1 hour
    }

    return {
      data: futureTides.length > 0 ? futureTides : tides.slice(0, 8),
      hourlyHeights,
    };
  }
}

