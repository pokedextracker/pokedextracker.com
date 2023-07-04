import type { Game, GameFamily } from './games';

export interface Pokemon {
  id: number;
  national_id: number;
  name: string;
  game_family: GameFamily;
  form: string | null;
  box: string | null;
  dex_number: number;
  locations: Location[];
  evolution_family: EvolutionFamily;
}

export interface Location {
  game: Game;
  value: string[];
  values: string[];
}

export interface EvolutionFamily {
  pokemon: EvolutionPokemon[][];
  evolutions: Evolution[][];
}

export interface Evolution {
  trigger: string;
  level?: number;
  candy_count?: number;
  stone?: string;
  held_item?: string;
  notes?: string;
}

export interface EvolutionPokemon {
  id: number;
  national_id: number;
  name: string;
  form: string | null;
}
