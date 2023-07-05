import { combineReducers } from 'redux';

import { dexTypesByGameFamilyId } from './dex-types-by-game-family-id';
import { dexTypesById } from './dex-types-by-id';
import { games } from './games';
import { gamesById } from './games-by-id';
import { users } from './users';

export const reducer = combineReducers({
  dexTypesByGameFamilyId,
  dexTypesById,
  games,
  gamesById,
  users,
});
