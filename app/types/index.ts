// The API's types are generated from the Go models into generated/ (mise
// tygo). This names them for the rest of the frontend, and adds the few types
// only the frontend has.
import type { Session as SessionClaims } from "./generated/auth";

export type { Capture } from "./generated/captures";
export type { Dex } from "./generated/dexes";
export type { DexType } from "./generated/dextypes";
export type { Game, GameFamily } from "./generated/games";
export type {
  Evolution,
  EvolutionFamily,
  EvolutionPokemon,
  Location,
  Pokemon,
} from "./generated/pokemon";
export type { Pokemon as CapturePokemon } from "./generated/pokemoncaptures";
export type { User } from "./generated/users";

// A session is what a login token holds, along with the token itself.
export interface Session extends SessionClaims {
  token: string;
}

// A customization is built from a dex type's tags.
export interface Customization {
  label: string;
  value: string;
  base_dex_type_id: number;
}
