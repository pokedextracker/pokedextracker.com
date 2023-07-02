import { API } from '../utils/api';
import { Config } from '../../config';
import { checkVersion } from './utils';

export const SET_DEX = 'SET_DEX';
export const SET_CURRENT_DEX = 'SET_CURRENT_DEX';

export function createDex ({ payload, username }) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.post(`${Config.API_HOST}/users/${username}/dexes`, payload);
  };
}

export function deleteDex (slug, username) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.delete(`${Config.API_HOST}/users/${username}/dexes/${slug}`);
  };
}

export function retrieveDex (slug, username) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.get(`${Config.API_HOST}/users/${username}/dexes/${slug}`)
    .then((dex) => {
      dispatch(setDex(dex, username));
      return dex;
    });
  };
}

export function updateDex ({ payload, slug, username }) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.post(`${Config.API_HOST}/users/${username}/dexes/${slug}`, payload)
    .then((dex) => {
      dispatch(setDex(dex, username));
      return dex;
    });
  };
}

export function setCurrentDex (slug, username) {
  return { type: SET_CURRENT_DEX, slug, username };
}

export function setDex (dex, username) {
  return { type: SET_DEX, dex, username };
}
