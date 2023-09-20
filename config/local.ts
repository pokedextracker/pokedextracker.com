import type { Config } from './types';

export const Local: Config = {
  API_HOST: 'http://localhost:8647',
  ENVIRONMENT: 'development',
  GA_ID: 'UA-45307701-5',
  ROLLBAR_TOKEN: '19ffd96c890b422287ce3a06a917678e',
  VERSION: process.env.VERSION || 'unknown',
};
