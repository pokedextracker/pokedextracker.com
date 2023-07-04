import type { Dex } from './dexes';

export interface User {
  id: number;
  username: string;
  friend_code_3ds: string | null;
  friend_code_switch: string | null;
  dexes: Dex[];
  donated: boolean;
  date_created: string;
  date_modified: string;
}

export interface Session {
  id: number;
  username: string;
  friend_code_3ds: string | null;
  friend_code_switch: string | null;
  date_created: string;
  date_modified: string;
}
