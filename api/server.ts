/**
 * Development server for the OceanGo API
 * For production, deploy as serverless functions (Vercel, Cloudflare Workers, etc.)
 */

// Load environment variables from .env file in project root
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (one level up from api/server.ts)
const envPath = resolve(__dirname, '..', '.env');
config({ path: envPath });

import { createServer } from 'node:http';
import { URL } from 'node:url';
import { handleStatusRequest } from './handler.js';

const PORT = process.env.PORT || 3001;

const server = createServer(async (req, res) => {
  // CORS headers for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  if (url.pathname === '/api/status' && req.method === 'GET') {
    try {
      const request = new Request(url.toString(), {
        method: req.method || 'GET',
        headers: req.headers as Record<string, string>,
      });
      
      const response = await handleStatusRequest(request);
      
      // Merge CORS headers with response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      Object.entries(headers).forEach(([key, value]) => {
        responseHeaders[key] = value;
      });
      
      res.writeHead(response.status, responseHeaders);
      const body = await response.text();
      res.end(body);
      return;
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
      return;
    }
  }

  // 404 for unknown routes
  res.writeHead(404, { ...headers, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🌊 OceanGo API server running on http://localhost:${PORT}/api/status`);
  console.log(`   Example: http://localhost:${PORT}/api/status?region=bayahibe`);
  console.log(`\n   Environment variables:`);
  const hasWeatherKey = !!process.env.OPENWEATHER_API_KEY;
  const hasTidesKey = !!process.env.WORLDTIDES_API_KEY;
  console.log(`   - OPENWEATHER_API_KEY: ${hasWeatherKey ? '✓ Found' : '✗ Not found (using mock data)'}`);
  console.log(`   - WORLDTIDES_API_KEY: ${hasTidesKey ? '✓ Found' : '✗ Not found (using mock data)'}`);
});

