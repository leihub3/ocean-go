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
 * Supports both formats:
 * 1. Traditional Vercel format (req, res) - for production
 * 2. Web API Request/Response format - for development server
 */
interface VercelRequest {
  query?: Record<string, string | string[] | undefined>;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
  url?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
}

// Helper to extract regionId from different request formats
function extractRegionId(reqOrRequest: VercelRequest | Request): string | null {
  // Check if it's a Web API Request
  if (reqOrRequest instanceof Request) {
    const url = new URL(reqOrRequest.url);
    return url.searchParams.get('region');
  }
  
  // It's a Vercel request object
  const req = reqOrRequest as VercelRequest;
  
  // Try req.query first (Vercel format)
  if (req.query && typeof req.query.region === 'string') {
    return req.query.region;
  }
  if (req.query && Array.isArray(req.query.region) && req.query.region.length > 0) {
    return req.query.region[0] || null;
  }
  
  // Fallback: parse from URL
  if (req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      return url.searchParams.get('region');
    } catch {
      return null;
    }
  }
  
  return null;
}

// Main handler - supports both formats
export default async function handler(
  reqOrRequest: VercelRequest | Request,
  res?: VercelResponse
): Promise<Response | void> {
  // Detect format: if second parameter is missing or it's a Request, use Web API format
  const isWebAPIFormat = reqOrRequest instanceof Request || !res;
  
  let regionId: string | null = null;
  
  try {
    // Extract regionId
    regionId = extractRegionId(reqOrRequest);

    if (!regionId) {
      if (isWebAPIFormat && reqOrRequest instanceof Request) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameter: region' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else if (res) {
        res.status(400).json({ error: 'Missing required parameter: region' });
        return;
      }
    }

    // Check cache first
    const cached = getCached(regionId);
    if (cached) {
      if (isWebAPIFormat && reqOrRequest instanceof Request) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else if (res) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(cached);
        return;
      }
    }

    // Get region configuration
    let regionConfig;
    try {
      regionConfig = getRegionConfig(regionId);
    } catch (error) {
      console.error('Region config error:', error);
      const errorResponse = {
        error: error instanceof Error ? error.message : 'Invalid region',
      };
      if (isWebAPIFormat && reqOrRequest instanceof Request) {
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else if (res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(400).json(errorResponse);
        return;
      }
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
      const errorResponse = {
        error: 'Failed to fetch ocean status',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined,
      };
      if (isWebAPIFormat && reqOrRequest instanceof Request) {
        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else if (res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json(errorResponse);
        return;
      }
    }

    // Cache the result
    setCache(regionId, status);

    // Log response size for debugging
    const responseSize = JSON.stringify(status).length;
    console.log(`[${regionId}] Response size: ${responseSize} bytes`);
    console.log(`[${regionId}] Returning response...`);

    if (isWebAPIFormat && reqOrRequest instanceof Request) {
      return new Response(JSON.stringify(status), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else if (res) {
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json(status);
      return;
    }
  } catch (error) {
    // Safely extract regionId from request if not already set
    if (!regionId) {
      regionId = extractRegionId(reqOrRequest) || 'unknown';
    }
    console.error(`[${regionId || 'unknown'}] Handler error:`, error);
    console.error(`[${regionId}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      name: error instanceof Error ? error.name : 'Unknown',
    });
    const errorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      // Include stack in development/debugging (remove in production if needed)
      ...(process.env.NODE_ENV !== 'production' && error instanceof Error && { stack: error.stack }),
    };
    if (isWebAPIFormat && reqOrRequest instanceof Request) {
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else if (res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(500).json(errorResponse);
      return;
    }
  }
}
