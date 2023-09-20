import type { Config } from './types';

export const Staging: Config = {
  API_HOST: 'https://staging.pokedextracker.com/api',
  ENVIRONMENT: 'staging',
  GA_ID: 'UA-45307701-5',
  ROLLBAR_TOKEN: '19ffd96c890b422287ce3a06a917678e',
  VERSION: process.env.VERSION || 'unknown',
};
