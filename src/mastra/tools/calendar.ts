import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { email: string }[];
}

const getAuth = () => {
  const oauth2Client = new OAuth2Client({
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI,
  });

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return oauth2Client;
};

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const calendarTool = createTool({
  id: 'calendar',
  description: 'Manage calendar events and appointments',
  inputSchema: z.object({
    action: z.enum(['list', 'create', 'update', 'delete']),
    timeMin: z.string().optional().default(() => new Date().toISOString()),
    timeMax: z.string().optional(),
    eventId: z.string().optional(),
    event: z.object({
      summary: z.string(),
      description: z.string().optional(),
      start: z.object({
        dateTime: z.string(),
        timeZone: z.string().default(userTimeZone),
      }).optional(),
      end: z.object({
        dateTime: z.string(),
        timeZone: z.string().default(userTimeZone),
      }).optional(),
      attendees: z.array(z.object({
        email: z.string(),
      })).optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    currentDateTime: z.string(),
    userTimeZone: z.string(),
    events: z.array(z.object({
      id: z.string(),
      summary: z.string(),
      description: z.string().optional(),
      start: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
      }),
      end: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
      }),
      attendees: z.array(z.object({
        email: z.string(),
      })).optional(),
    })).optional(),
  }),
  execute: async ({ context }) => {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() });

    const baseResponse = {
      currentDateTime: new Date().toISOString(),
      userTimeZone,
    };

    switch (context.action) {
      case 'list':
        try {
          const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: context.timeMin,
            timeMax: context.timeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 10,
          });

          return {
            ...baseResponse,
            success: true,
            message: 'Events retrieved successfully',
            events: response.data.items as CalendarEvent[],
          };
        } catch (error) {
          return {
            ...baseResponse,
            success: false,
            message: `Failed to retrieve events: ${error instanceof Error ? error.message : 'Unknown error'}`,
            events: [],
          };
        }

      case 'create':
        if (!context.event) {
          return {
            ...baseResponse,
            success: false,
            message: 'Event details are required for creation',
            events: [],
          };
        }

        try {
          const eventWithTimezone = {
            ...context.event,
            start: {
              ...context.event.start,
              timeZone: context.event.start?.timeZone || userTimeZone,
            },
            end: {
              ...context.event.end,
              timeZone: context.event.end?.timeZone || userTimeZone,
            },
          };

          const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventWithTimezone,
          });

          return {
            ...baseResponse,
            success: true,
            message: 'Event created successfully',
            events: [response.data as CalendarEvent],
          };
        } catch (error) {
          return {
            ...baseResponse,
            success: false,
            message: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            events: [],
          };
        }

      case 'update':
        if (!context.eventId || !context.event) {
          return {
            ...baseResponse,
            success: false,
            message: 'Event ID and updated details are required',
            events: [],
          };
        }

        try {
          const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: context.eventId,
            requestBody: context.event,
          });

          return {
            ...baseResponse,
            success: true,
            message: 'Event updated successfully',
            events: [response.data as CalendarEvent],
          };
        } catch (error) {
          return {
            ...baseResponse,
            success: false,
            message: `Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            events: [],
          };
        }

      case 'delete':
        if (!context.eventId) {
          return {
            ...baseResponse,
            success: false,
            message: 'Event ID is required for deletion',
            events: [],
          };
        }

        try {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: context.eventId,
          });

          return {
            ...baseResponse,
            success: true,
            message: 'Event deleted successfully',
            events: [],
          };
        } catch (error) {
          return {
            ...baseResponse,
            success: false,
            message: `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`,
            events: [],
          };
        }
    }
  },
}); 