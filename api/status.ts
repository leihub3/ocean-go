/**
 * Vercel serverless function for GET /api/status
 * 
 * Query parameters:
 * - region: Region ID (e.g., "bayahibe" or "bayahibe-dominicus")
 * 
 * This file is the entry point for Vercel's serverless function system.
 * It imports the handler logic from lib/api-handler.ts which can be reused elsewhere.
 */
import { handleStatusRequest } from '../lib/api-handler.js';

export default async function handler(request: Request): Promise<Response> {
  // Vercel passes a Request object
  return handleStatusRequest(request);
}


