/**
 * Vercel serverless function for GET /api/status
 * 
 * Query parameters:
 * - region: Region ID (e.g., "bayahibe" or "bayahibe-dominicus")
 * 
 * This is the only serverless function entry point for Vercel.
 * All handler logic is inlined here to avoid import path issues and ensure
 * Vercel only detects this single file as a serverless function.
 */

import type { OceanStatusResponse } from '../lib/api/services/ocean-status.service.js';
import { OceanStatusService } from '../lib/api/services/ocean-status.service.js';
import { bayahibeConfig } from '../lib/api/regions/bayahibe.config.js';
import { puntaCanaConfig } from '../lib/api/regions/punta-cana.config.js';
import { sosuaConfig } from '../lib/api/regions/sosua.config.js';
import { cabareteConfig } from '../lib/api/regions/cabarete.config.js';

/**
 * Simple in-memory cache
 * In production, consider using Redis or similar
 */
interface CacheEntry {
  data: OceanStatusResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Get cached data if valid, otherwise null
 */
function getCached(regionId: string): OceanStatusResponse | null {
  const entry = cache.get(regionId);
  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(regionId);
    return null;
  }

  return entry.data;
}

/**
 * Set cache entry
 */
function setCache(regionId: string, data: OceanStatusResponse): void {
  cache.set(regionId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get region configuration by ID
 */
function getRegionConfig(regionId: string) {
  const regions: Record<string, typeof bayahibeConfig> = {
    'bayahibe-dominicus': bayahibeConfig,
    bayahibe: bayahibeConfig, // Allow short name
    'punta-cana': puntaCanaConfig,
    puntacana: puntaCanaConfig, // Allow short name
    sosua: sosuaConfig,
    cabarete: cabareteConfig,
  };

  const config = regions[regionId.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown region: ${regionId}`);
  }

  return config;
}

/**
 * Vercel serverless function handler
 */
export default async function handler(request: Request): Promise<Response> {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const regionId = url.searchParams.get('region');

    if (!regionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: region' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check cache first
    const cached = getCached(regionId);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get region configuration
    let regionConfig;
    try {
      regionConfig = getRegionConfig(regionId);
    } catch (error) {
      console.error('Region config error:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Invalid region',
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get ocean status
    let status;
    try {
      const service = new OceanStatusService();
      status = await service.getOceanStatus(regionConfig);
    } catch (error) {
      console.error('Service error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error; // Re-throw to be caught by outer catch
    }

    // Cache the result
    setCache(regionId, status);

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Handler error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      name: error instanceof Error ? error.name : 'Unknown',
    });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        // Include stack in development/debugging (remove in production if needed)
        ...(process.env.NODE_ENV !== 'production' && error instanceof Error && { stack: error.stack }),
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
