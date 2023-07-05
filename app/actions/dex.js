import { API } from '../utils/api';

export const SET_DEX = 'SET_DEX';
export const SET_CURRENT_DEX = 'SET_CURRENT_DEX';

export function createDex ({ payload, username }) {
  return () => {
    return API.post(`/users/${username}/dexes`, payload);
  };
}

export function deleteDex (slug, username) {
  return () => {
    return API.delete(`/users/${username}/dexes/${slug}`);
  };
}

export function updateDex ({ payload, slug, username }) {
  return (dispatch) => {
    return API.post(`/users/${username}/dexes/${slug}`, payload)
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
