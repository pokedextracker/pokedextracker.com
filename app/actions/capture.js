import { API }          from '../utils/api';
import { Config }       from '../../config';
import { checkVersion } from './utils';

export const MARK_CAPTURED = 'MARK_CAPTURED';
export const SET_CAPTURES = 'SET_CAPTURES';

export function createCaptures ({ payload, slug, username }) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.post(`${Config.API_HOST}/captures`, payload)
      .then(() => dispatch(markCaptured(true, payload.pokemon, slug, username)));
  };
}

export function deleteCaptures ({ payload, slug, username }) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.delete(`${Config.API_HOST}/captures`, payload)
      .then(() => dispatch(markCaptured(false, payload.pokemon, slug, username)));
  };
}

export function listCaptures ({ slug }, username) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.get(`${Config.API_HOST}/users/${username}/dexes/${slug}/captures`)
      .then((captures) => {
        dispatch(setCaptures(captures, slug, username));
        return captures;
      });
  };
}

export function setCaptures (captures, slug, username) {
  return { type: SET_CAPTURES, captures, slug, username };
}

export function markCaptured (captured, pokemon, slug, username) {
  return { type: MARK_CAPTURED, captured, pokemon, slug, username };
}
