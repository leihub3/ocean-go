# Deployment Checklist for Vercel

## Required Environment Variables in Vercel

To deploy successfully, you need to configure these environment variables in your Vercel project dashboard:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

### Required for Real Data:
- `OPENWEATHER_API_KEY` - Your OpenWeather API key
- `WORLDTIDES_API_KEY` - Your WorldTides API key

### Optional:
- `NODE_ENV` - Set to `production` (usually set automatically)

## How to Add Environment Variables in Vercel:

1. Log into [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`ocean-go`)
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: `OPENWEATHER_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production, Preview, and Development (or just Production)
5. Repeat for `WORLDTIDES_API_KEY`
6. **Redeploy** your application after adding variables

## If API Keys Are Missing:

The application will use **mock data** automatically, so it should still work. However, you'll see warnings in the Vercel function logs.

## Troubleshooting:

### Function Timeout Error:
- The function has a 30-second timeout
- Each API call has a 15-second timeout
- If both APIs timeout, you'll get an error
- Check Vercel logs: Project → Functions → View Logs

### Check Function Logs:
1. Go to Vercel Dashboard → Your Project
2. Click on **Functions** tab
3. Click on `api/status.ts`
4. View **Runtime Logs** to see what's happening

## Local vs Production:

- **Local**: Uses `.env` file from project root
- **Production**: Uses environment variables from Vercel dashboard

Make sure your `.env` file has the same variable names as what you set in Vercel.

