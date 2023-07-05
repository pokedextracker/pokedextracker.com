import { API } from '../utils/api';

export const SET_GAMES = 'SET_GAMES';

export function listGames () {
  return (dispatch) => {
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
