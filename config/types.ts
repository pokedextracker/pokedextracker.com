export enum Environment {
  Development = 'development',
  Local = 'local',
  Production = 'production',
  Staging = 'staging',
}

export interface Config {
  API_HOST: string;
  ENVIRONMENT: string;
  GA_ID: string;
  ROLLBAR_TOKEN: string;
  VERSION: string;
}
