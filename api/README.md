# OceanGo Backend API

Serverless-friendly backend that aggregates weather and tide data from external APIs and applies activity-specific rules to generate recommendations.

## Architecture

```
/api
 ├─ providers/          # External API integrations (normalized)
 ├─ rules/             # Activity-specific decision logic
 ├─ services/          # Business logic orchestration
 ├─ regions/           # Region configurations
 └─ handler.ts         # API endpoint handler
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API keys:**
   Create a `.env` file in the root directory (not in `/api`):
   ```bash
   OPENWEATHER_API_KEY=your_key_here
   WORLDTIDES_API_KEY=your_key_here
   ```
   
   If keys are not provided, the service will use mock data with realistic fallbacks.

3. **Run development server:**
   ```bash
   npm run dev:api
   ```
   
   The API will be available at `http://localhost:3001/api/status`

## API Endpoint

### GET `/api/status?region=bayahibe`

Returns ocean activity recommendations for a given region.

**Query Parameters:**
- `region` (required): Region ID (e.g., "bayahibe" or "bayahibe-dominicus")

**Response:**
```json
{
  "region": "Bayahibe / Dominicus",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activities": {
    "snorkeling": {
      "status": "good",
      "reason": "Perfect conditions right now...",
      "window": "Next 4-6 hours"
    },
    "kayaking": { ... },
    "sup": { ... },
    "fishing": { ... }
  },
  "errors": [] // Optional: provider errors if any
}
```

## Development

The backend is designed to work with serverless platforms:

- **Vercel**: Deploy `handler.ts` as a serverless function
- **Cloudflare Workers**: Adapt `handler.ts` for Workers runtime
- **AWS Lambda**: Wrap `handler.ts` in Lambda handler

## Environment Variables

- `OPENWEATHER_API_KEY`: OpenWeather One Call API key
- `WORLDTIDES_API_KEY`: WorldTides API key
- `PORT`: Server port (development only, defaults to 3001)

