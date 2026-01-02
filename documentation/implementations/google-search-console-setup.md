# Google Search Console API Setup for Search Volume Data

## Step 1: Enable Google Search Console API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the "Search Console API"
4. Create credentials (Service Account)

## Step 2: Get API Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Download the JSON key file
4. Add the file path to your environment variables

## Step 3: Add Environment Variables

Add these to your `.env.local`:

```
# Google Search Console API
GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH=/path/to/your/service-account.json
GOOGLE_SEARCH_CONSOLE_PROPERTY=https://thepickleco.com
```

## Step 4: Install Google API Client

```bash
npm install googleapis
```

## Step 5: Create Search Console Integration

Create a new file: `lib/google-search-console.ts`

```typescript
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export class GoogleSearchConsole {
  private auth: JWT;
  private searchConsole: any;

  constructor() {
    this.auth = new JWT({
      email: process.env.GOOGLE_SEARCH_CONSOLE_EMAIL,
      key: process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    this.searchConsole = google.searchconsole({ version: 'v1', auth: this.auth });
  }

  async getSearchAnalytics(query: string, startDate: string, endDate: string) {
    try {
      const response = await this.searchConsole.searchAnalytics.query({
        siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 25,
          query: query,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      return null;
    }
  }

  async getKeywordPerformance(keywords: string[]) {
    const results = [];
    
    for (const keyword of keywords) {
      const data = await this.getSearchAnalytics(
        keyword,
        '2024-01-01',
        new Date().toISOString().split('T')[0]
      );
      
      results.push({
        keyword,
        data
      });
    }
    
    return results;
  }
}
```

## Step 6: Create API Route for Search Data

Create: `app/api/search-analytics/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { GoogleSearchConsole } from '@/lib/google-search-console';

export async function GET() {
  const searchConsole = new GoogleSearchConsole();
  
  const keywords = [
    // Pickleball
    'pickleball Mexico City',
    'clases de pickleball CDMX',
    'donde jugar pickleball Mexico City',
    'pickleball para principiantes CDMX',
    'torneos de pickleball Mexico City',
    
    // Padel
    'padel Mexico City',
    'clases de padel CDMX',
    'donde jugar padel Mexico City',
    'canchas de padel CDMX',
    'torneos de padel Mexico City',
    
    // Tennis
    'tennis Mexico City',
    'clases de tenis CDMX',
    'donde jugar tenis Mexico City',
    'canchas de tenis CDMX',
    'torneos de tenis Mexico City',
  ];

  const results = await searchConsole.getKeywordPerformance(keywords);
  
  return NextResponse.json({ results });
}
```

## Step 7: Test the Integration

1. Start your development server
2. Visit: `http://localhost:3000/api/search-analytics`
3. You should see search performance data for all keywords

## Alternative: Manual Data Collection

If API setup is complex, you can manually collect data:

1. Go to Google Search Console
2. Navigate to "Performance" → "Search results"
3. Add each keyword as a filter
4. Export the data to CSV
5. Share the data with me for analysis

## Expected Data Format

The API will return data like:
```json
{
  "keyword": "pickleball Mexico City",
  "clicks": 45,
  "impressions": 1200,
  "ctr": 0.0375,
  "position": 8.5
}
```

## Next Steps

1. Set up the API credentials
2. Install the required packages
3. Test the integration
4. Share the data with me for strategic analysis 