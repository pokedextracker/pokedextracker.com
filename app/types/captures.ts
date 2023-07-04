import type { GameFamily } from './games';

export interface Capture {
  dex_id: number;
  pokemon: CapturePokemon;
  captured: boolean;
}

export interface CapturePokemon {
  id: number;
  national_id: number;
  name: string;
  game_family: GameFamily;
  form: string | null;
  box: string | null;
  dex_number: number;
}
