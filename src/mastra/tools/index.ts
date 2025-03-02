import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}

export const emailTool = createTool({
  id: 'get-emails',
  description: 'Fetch recent emails from Gmail inbox',
  inputSchema: z.object({
    maxResults: z.number().optional().default(10).describe('Number of emails to fetch'),
    query: z.string().optional().describe('Search query to filter emails'),
  }),
  outputSchema: z.array(z.object({
    id: z.string(),
    subject: z.string(),
    from: z.string(),
    date: z.string(),
    snippet: z.string(),
  })),
  execute: async ({ context }) => {
    return await getEmails(context.maxResults, context.query);
  },
});

const getEmails = async (maxResults: number = 10, query?: string): Promise<EmailMessage[]> => {
  const oauth2Client = new OAuth2Client({
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI,
  });

  // You'll need to implement token management
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: maxResults,
    q: query,
  });

  const emails: EmailMessage[] = [];

  if (response.data.messages) {
    for (const message of response.data.messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      });

      const headers = email.data.payload?.headers;
      const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers?.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers?.find(h => h.name === 'Date')?.value || '';

      emails.push({
        id: message.id!,
        subject,
        from,
        date,
        snippet: email.data.snippet || '',
      });
    }
  }

  return emails;
};
