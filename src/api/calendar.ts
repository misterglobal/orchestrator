import { calendar_v3 } from 'googleapis';
import { getAuth } from '../mastra/tools/calendar';

export async function handleCalendarRequest(req: Request): Promise<Response> {
  try {
    const { toolCallId, parameters } = await req.json();
    const calendar = calendar_v3.Calendar({ version: 'v3', auth: getAuth() });
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let result: string;

    switch (parameters.action) {
      case 'list':
        const listResponse = await calendar.events.list({
          calendarId: 'primary',
          timeMin: parameters.timeMin || new Date().toISOString(),
          timeMax: parameters.timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 10,
        });

        const events = listResponse.data.items || [];
        result = formatEventsForVoice(events);
        break;

      case 'create':
        if (!parameters.event) {
          throw new Error('Event details required');
        }

        const createResponse = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            ...parameters.event,
            start: {
              ...parameters.event.start,
              timeZone: parameters.event.start?.timeZone || userTimeZone,
            },
            end: {
              ...parameters.event.end,
              timeZone: parameters.event.end?.timeZone || userTimeZone,
            },
          },
        });

        result = `Created event: ${createResponse.data.summary} at ${new Date(createResponse.data.start?.dateTime || '').toLocaleString()}`;
        break;

      // Add other cases for update and delete...
    }

    return new Response(JSON.stringify({
      results: [{
        toolCallId,
        result
      }]
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      results: [{
        toolCallId: req.body.toolCallId,
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

function formatEventsForVoice(events: calendar_v3.Schema$Event[]): string {
  if (events.length === 0) {
    return "You don't have any upcoming events.";
  }

  const eventDescriptions = events.map(event => {
    const startTime = new Date(event.start?.dateTime || '');
    return `${event.summary} at ${startTime.toLocaleTimeString()}`;
  });

  return `You have ${events.length} upcoming events: ${eventDescriptions.join('; ')}`;
} 