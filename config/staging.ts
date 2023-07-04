import type { Config } from './types';

export const Staging: Config = {
  API_HOST: 'https://staging.pokedextracker.com/api',
  ENVIRONMENT: 'staging',
  GA_ID: 'UA-45307701-5',
  ROLLBAR_TOKEN: '3695370c334447daa140a0d0e902360b',
  VERSION: process.env.VERSION || 'unknown',
};
