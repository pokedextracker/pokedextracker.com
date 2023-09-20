import type { Config } from './types';

export const Production: Config = {
  API_HOST: 'https://pokedextracker.com/api',
  ENVIRONMENT: 'production',
  GA_ID: 'UA-45307701-4',
  ROLLBAR_TOKEN: '19ffd96c890b422287ce3a06a917678e',
  VERSION: process.env.VERSION || 'unknown',
};
