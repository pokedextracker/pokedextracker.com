import keyBy from 'lodash/keyBy';

import { SET_GAMES } from '../actions/game';

export function gamesById (state = {}, action) {
  switch (action.type) {
    case SET_GAMES:
      return keyBy(action.games, 'id');
    default:
      return state;
  }
}
