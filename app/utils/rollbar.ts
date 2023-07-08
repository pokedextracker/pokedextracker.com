import Constructor from 'rollbar';

import { Config } from '../../config';

const Rollbar = new Constructor({
  accessToken: Config.ROLLBAR_TOKEN,
  codeVersion: Config.VERSION,
  enabled: Config.ENVIRONMENT !== 'development',
  environment: Config.ENVIRONMENT,
  hostSafeList: ['pokedextracker.com', 'staging.pokedextracker.com'],
  captureUncaught: true,
  captureUnhandledRejections: true,
  autoInstrument: {
    networkRequestBody: true,
    networkResponseBody: true,
    networkResponseHeaders: true,
  },
  payload: {
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: Config.VERSION,
        guess_uncaught_frames: true,
      },
    },
  },
});

export { Rollbar };
