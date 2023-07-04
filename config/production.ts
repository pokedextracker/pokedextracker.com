import type { Config } from './types';

export const Production: Config = {
  API_HOST: 'https://pokedextracker.com/api',
  ENVIRONMENT: 'production',
  GA_ID: 'UA-45307701-4',
  ROLLBAR_TOKEN: '3695370c334447daa140a0d0e902360b',
  VERSION: process.env.VERSION || 'unknown',
};
