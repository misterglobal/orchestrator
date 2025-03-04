export const vapiCalendarConfig = {
  type: "function",
  messages: [
    {
      type: "request-start",
      content: "Let me check your calendar..."
    },
    {
      type: "request-complete",
      content: "Here's what I found in your calendar:"
    },
    {
      type: "request-failed",
      content: "I'm having trouble accessing your calendar right now."
    },
    {
      type: "request-response-delayed",
      content: "Still retrieving your calendar information...",
      timingMilliseconds: 2000
    }
  ],
  function: {
    name: "manage_calendar",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "create", "update", "delete"]
        },
        timeMin: {
          type: "string",
          description: "ISO string for start time"
        },
        timeMax: {
          type: "string",
          description: "ISO string for end time"
        },
        eventId: {
          type: "string",
          description: "Event ID for updates or deletions"
        },
        event: {
          type: "object",
          properties: {
            summary: { type: "string" },
            description: { type: "string" },
            start: {
              type: "object",
              properties: {
                dateTime: { type: "string" },
                timeZone: { type: "string" }
              }
            },
            end: {
              type: "object",
              properties: {
                dateTime: { type: "string" },
                timeZone: { type: "string" }
              }
            },
            attendees: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  email: { type: "string" }
                }
              }
            }
          }
        }
      },
      required: ["action"]
    },
    description: "Manage calendar events including listing, creating, updating, and deleting events"
  },
  async: false,
  server: {
    url: "https://your-api-endpoint/calendar"
  }
}; 