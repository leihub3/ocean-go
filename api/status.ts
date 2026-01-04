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
  let regionId: string | null = null;
  
  try {
    // Parse query parameters
    // Handle both absolute URLs and relative paths (Vercel edge runtime)
    let url: URL;
    try {
      url = new URL(request.url);
    } catch (urlError) {
      // If request.url is relative, construct absolute URL
      // Vercel provides request headers with host information
      // Handle both Headers object and plain object
      const headers = request.headers || {};
      const getHeader = (name: string): string | null => {
        if (typeof headers.get === 'function') {
          return headers.get(name);
        }
        // Plain object access
        const lowerName = name.toLowerCase();
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === lowerName) {
            return Array.isArray(value) ? value[0] : String(value);
          }
        }
        return null;
      };
      
      const host = getHeader('host') || getHeader('x-forwarded-host') || 'localhost';
      const protocol = getHeader('x-forwarded-proto') || 'https';
      url = new URL(request.url, `${protocol}://${host}`);
    }
    regionId = url.searchParams.get('region');

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
      console.log(`[${regionId}] Fetching ocean status...`);
      const startTime = Date.now();
      status = await service.getOceanStatus(regionConfig);
      const duration = Date.now() - startTime;
      console.log(`[${regionId}] Ocean status fetched in ${duration}ms`);
      
      // Log response size for debugging
      const responseSize = JSON.stringify(status).length;
      console.log(`[${regionId}] Response size: ${responseSize} bytes`);
    } catch (error) {
      console.error(`[${regionId}] Service error:`, error);
      console.error(`[${regionId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
      // Return error response instead of throwing to provide better error details
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch ocean status',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined,
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

    // Cache the result
    setCache(regionId, status);

    // Serialize response
    const jsonStart = Date.now();
    const jsonResponse = JSON.stringify(status);
    const jsonDuration = Date.now() - jsonStart;
    console.log(`[${regionId}] JSON serialization took ${jsonDuration}ms`);

    return new Response(jsonResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    // Safely extract regionId from request URL if not already set
    if (!regionId) {
      try {
        let url: URL;
        try {
          url = new URL(request.url);
        } catch {
          // Handle both Headers object and plain object
          const headers = request.headers || {};
          const getHeader = (name: string): string | null => {
            if (typeof headers.get === 'function') {
              return headers.get(name);
            }
            // Plain object access
            const lowerName = name.toLowerCase();
            for (const [key, value] of Object.entries(headers)) {
              if (key.toLowerCase() === lowerName) {
                return Array.isArray(value) ? value[0] : String(value);
              }
            }
            return null;
          };
          
          const host = getHeader('host') || getHeader('x-forwarded-host') || 'localhost';
          const protocol = getHeader('x-forwarded-proto') || 'https';
          url = new URL(request.url, `${protocol}://${host}`);
        }
        regionId = url.searchParams.get('region');
      } catch {
        regionId = 'unknown';
      }
    }
    console.error(`[${regionId || 'unknown'}] Handler error:`, error);
    console.error(`[${regionId}] Error details:`, {
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
