import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { weatherAgent, emailAgent, calendarAgent } from './agents/index.js';

export const mastra = new Mastra({
  agents: { weatherAgent, emailAgent, calendarAgent },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

export { weatherAgent, emailAgent, calendarAgent };
