import { combineReducers } from 'redux';

import { currentPokemon } from './current-pokemon';
import { dexTypesByGameFamilyId } from './dex-types-by-game-family-id';
import { dexTypesById } from './dex-types-by-id';
import { games } from './games';
import { gamesById } from './games-by-id';
import { notification } from './notification';
import { pokemon } from './pokemon';
import { reload } from './reload';
import { showInfo } from './show-info';
import { users } from './users';

export const reducer = combineReducers({
  currentPokemon,
  dexTypesByGameFamilyId,
  dexTypesById,
  games,
  gamesById,
  notification,
  pokemon,
  reload,
  showInfo,
  users,
});
