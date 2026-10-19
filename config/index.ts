import { Development } from './development';

import type { Config as ConfigType } from './types';

// The Go server adds this to index.html (pkg/server's frontendConfig), so the
// same build reports the right environment wherever it runs.
interface ServerConfig {
  environment: string;
  rollbarToken: string;
  version: string;
}

declare global {
  interface Window {
    POKEDEXTRACKER_CONFIG?: ServerConfig;
  }
}

// Any field the server leaves out falls back to the development value.
function fromServer (server: Partial<ServerConfig>): ConfigType {
  return {
    API_HOST: '/api',
    ENVIRONMENT: server.environment || Development.ENVIRONMENT,
    ROLLBAR_TOKEN: server.rollbarToken || Development.ROLLBAR_TOKEN,
    VERSION: server.version || Development.VERSION,
  };
}

const server = window.POKEDEXTRACKER_CONFIG;

// Without the server's config (the webpack dev server), the app uses the
// development config.
export const Config: ConfigType = server ? fromServer(server) : Development;
