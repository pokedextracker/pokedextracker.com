export interface GameFamily {
  id: string;
  generation: number;
  regional_total: number;
  national_total: number;
  regional_support: boolean;
  national_support: boolean;
  order: number;
  published: boolean;
}

export interface Game {
  id: string;
  name: string;
  game_family: GameFamily;
  order: number;
}
