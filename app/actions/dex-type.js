import { API } from '../utils/api';

export const SET_DEX_TYPES = 'SET_DEX_TYPES';

export function listDexTypes () {
  return (dispatch) => {
    return API.get('/dex-types')
    .then((dexTypes) => {
      dispatch(setDexTypes(dexTypes));
      return dexTypes;
    });
  };
}

export function setDexTypes (dexTypes) {
  return { type: SET_DEX_TYPES, dexTypes };
}
