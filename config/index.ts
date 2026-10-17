import { Development } from './development';
import { Production } from './production';
import { Staging } from './staging';
import { Environment } from './types';

import type { Config as ConfigType } from './types';

const ENVIRONMENTS: Record<string, Environment> = {
  'pokedextracker.com': Environment.Production,
  'staging.pokedextracker.com': Environment.Staging,
};

// A production build running on this machine (mise start:preview) is still
// development, so it doesn't report to production's analytics or Rollbar.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

const environment = ENVIRONMENTS[window.location.hostname] ||
  (LOCAL_HOSTS.includes(window.location.hostname) ? Environment.Development : process.env.NODE_ENV) ||
  Environment.Development;

const Configs: Record<Environment, ConfigType> = {
  [Environment.Development]: Development,
  [Environment.Production]: Production,
  [Environment.Staging]: Staging,
};

export const Config = Configs[environment] as ConfigType;
