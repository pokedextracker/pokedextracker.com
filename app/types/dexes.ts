import type { DexType } from './dex-types';
import type { Game } from './games';

export interface Dex {
  id: number;
  user_id: number;
  title: string;
  slug: string;
  shiny: boolean;
  game: Game;
  dex_type: DexType;
  regional: boolean | null;
  caught: number;
  total: number;
  date_created: string;
  date_modified: string;
}
