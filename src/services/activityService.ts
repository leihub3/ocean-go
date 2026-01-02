import type { OceanGoResponse } from '../types';

/**
 * Backend API endpoint configuration
 * In development, this should point to your local backend server
 * In production, update to your deployed backend URL
 */
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || '/api';

/**
 * Fetch ocean status from backend API
 * This is the ONLY endpoint the frontend should consume
 */
export const getActivityRecommendations = async (
  regionId: string
): Promise<OceanGoResponse> => {
  const url = new URL(`${API_BASE_URL}/status`, window.location.origin);
  url.searchParams.set('region', regionId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Provide more specific error messages based on status code
    let errorMessage = errorData.error || 'Failed to load recommendations';
    
    if (response.status === 400) {
      errorMessage = errorData.error || 'Invalid region selected. Please try another location.';
    } else if (response.status === 404) {
      errorMessage = 'API endpoint not found. Please check your connection.';
    } else if (response.status === 500) {
      errorMessage = 'Server error. Please try again in a moment.';
    } else if (response.status === 0 || response.status >= 500) {
      errorMessage = 'Unable to reach the server. Please check your internet connection.';
    }
    
    const error = new Error(errorMessage);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const data: OceanGoResponse = await response.json();
  return data;
};

