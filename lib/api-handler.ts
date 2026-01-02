import type { OceanStatusResponse } from '../api/services/ocean-status.service.js';
import { OceanStatusService } from '../api/services/ocean-status.service.js';
import { bayahibeConfig } from '../api/regions/bayahibe.config.js';
import { puntaCanaConfig } from '../api/regions/punta-cana.config.js';
import { sosuaConfig } from '../api/regions/sosua.config.js';
import { cabareteConfig } from '../api/regions/cabarete.config.js';

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
 * API handler for GET /api/status
 * 
 * Query parameters:
 * - region: Region ID (e.g., "bayahibe" or "bayahibe-dominicus")
 * 
 * Response:
 * - 200: Ocean status response
 * - 400: Invalid region parameter
 * - 500: Server error
 */
export async function handleStatusRequest(request: Request): Promise<Response> {
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
        },
      });
    }

    // Get region configuration
    let regionConfig;
    try {
      regionConfig = getRegionConfig(regionId);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Invalid region',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get ocean status
    const service = new OceanStatusService();
    const status = await service.getOceanStatus(regionConfig);

    // Cache the result
    setCache(regionId, status);

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Handler error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

