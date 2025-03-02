import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { weatherAgent, emailAgent } from './agents';

export const mastra = new Mastra({
  agents: { weatherAgent, emailAgent },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

export { weatherAgent, emailAgent };
