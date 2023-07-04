import { API } from '../utils/api';
import { checkVersion } from './utils';

export const SET_GAMES = 'SET_GAMES';

export function listGames () {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.get('/games')
    .then((games) => {
      dispatch(setGames(games));
      return games;
    });
  };
}

export function setGames (games) {
  return { type: SET_GAMES, games };
}
