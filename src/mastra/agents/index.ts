import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { weatherTool, emailTool } from '../tools';

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: `
    You are a helpful assistant that can provide weather information.
    When asked about the weather, use the weatherTool to get current conditions.
    Provide clear, concise responses about temperature, conditions, and other relevant details.
  `,
  model: openai('gpt-4o'),
  tools: { weatherTool },
});

export const emailAgent = new Agent({
  name: 'Email Agent',
  instructions: `
    You are an email management assistant that helps users access their emails.
    When handling email requests:
    - Help users find specific emails using search queries
    - Show relevant email details (subject, sender, date)
    - Keep responses organized and easy to read
    - Ask for clarification if the request is unclear
  `,
  model: openai('gpt-4o'),
  tools: { emailTool },
});
