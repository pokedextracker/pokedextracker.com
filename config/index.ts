import { Development } from './development';
import { Production } from './production';
import { Staging } from './staging';
import { Environment } from './types';

import type { Config as ConfigType } from './types';

const ENVIRONMENTS: Record<string, Environment> = {
  'pokedextracker.com': Environment.Production,
  'staging.pokedextracker.com': Environment.Staging,
};

// Only the real domains get the production and staging configs. Anything else
// (localhost, mise start:preview, a *.fly.dev address before the DNS
// cutover) is development, so it doesn't report to production's analytics or
// Rollbar.
const environment = ENVIRONMENTS[window.location.hostname] || Environment.Development;

const Configs: Record<Environment, ConfigType> = {
  [Environment.Development]: Development,
  [Environment.Production]: Production,
  [Environment.Staging]: Staging,
};

export const Config = Configs[environment] as ConfigType;
