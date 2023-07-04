import { Development } from './development';
import { Local } from './local';
import { Production } from './production';
import { Staging } from './staging';
import { Environment } from './types';

import type { Config as ConfigType } from './types';

const ENVIRONMENTS: Record<string, Environment> = {
  'pokedextracker.com': Environment.Production,
  'staging.pokedextracker.com': Environment.Staging,
};

const environment = ENVIRONMENTS[window.location.hostname] || process.env.NODE_ENV || Environment.Development;

const Configs: Record<Environment, ConfigType> = {
  [Environment.Development]: Development,
  [Environment.Local]: Local,
  [Environment.Production]: Production,
  [Environment.Staging]: Staging,
};

export const Config = Configs[environment];
