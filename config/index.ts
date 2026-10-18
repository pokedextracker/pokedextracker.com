import { Development } from './development';
import { Production } from './production';
import { Staging } from './staging';
import { Environment } from './types';

import type { Config as ConfigType } from './types';

// The Go server adds this to index.html (pkg/server's frontendConfig), so the
// same build reports the right environment wherever it runs.
interface ServerConfig {
  environment: string;
  googleAnalyticsId: string;
  rollbarToken: string;
  version: string;
}

declare global {
  interface Window {
    POKEDEXTRACKER_CONFIG?: ServerConfig;
  }
}

// TODO(cleanup): After the cutover, remove this hostname fallback, along with
// production.ts and staging.ts. It's only for the old nginx frontend, which
// can't add the server config. Without either (the webpack dev server), the
// app uses the development config.
const ENVIRONMENTS: Record<string, Environment> = {
  'pokedextracker.com': Environment.Production,
  'staging.pokedextracker.com': Environment.Staging,
};

const Configs: Record<Environment, ConfigType> = {
  [Environment.Development]: Development,
  [Environment.Production]: Production,
  [Environment.Staging]: Staging,
};

// Any field the server leaves out falls back to the development value.
function fromServer (server: Partial<ServerConfig>): ConfigType {
  return {
    API_HOST: '/api',
    ENVIRONMENT: server.environment || Development.ENVIRONMENT,
    GA_ID: server.googleAnalyticsId || Development.GA_ID,
    ROLLBAR_TOKEN: server.rollbarToken || Development.ROLLBAR_TOKEN,
    VERSION: server.version || Development.VERSION,
  };
}

const server = window.POKEDEXTRACKER_CONFIG;

export const Config: ConfigType = server ?
  fromServer(server) :
  Configs[ENVIRONMENTS[window.location.hostname] || Environment.Development];
