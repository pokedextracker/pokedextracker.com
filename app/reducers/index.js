import { combineReducers } from 'redux';

import { currentPokemon } from './current-pokemon';
import { dexTypesByGameFamilyId } from './dex-types-by-game-family-id';
import { dexTypesById } from './dex-types-by-id';
import { games } from './games';
import { gamesById } from './games-by-id';
import { pokemon } from './pokemon';
import { showInfo } from './show-info';
import { users } from './users';

export const reducer = combineReducers({
  currentPokemon,
  dexTypesByGameFamilyId,
  dexTypesById,
  games,
  gamesById,
  pokemon,
  showInfo,
  users,
});
