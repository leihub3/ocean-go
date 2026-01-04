/**
 * Convert degrees (0-360) to wind direction (N, S, E, O, SE, etc.)
 * Uses 16-point compass rose
 */
export function degreesToWindDirection(degrees: number): string {
  // Normalize degrees to 0-360
  const normalized = ((degrees % 360) + 360) % 360;
  
  // 16-point compass rose in Spanish
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSO', 'SO', 'OSO',
    'O', 'ONO', 'NO', 'NNO'
  ];
  
  // Each direction covers 22.5 degrees (360 / 16)
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index] || 'N';
}

