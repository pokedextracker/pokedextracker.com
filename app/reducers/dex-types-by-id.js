import keyBy from 'lodash/keyBy';

import { SET_DEX_TYPES } from '../actions/dex-type';

export function dexTypesById (state = {}, action) {
  switch (action.type) {
    case SET_DEX_TYPES:
      return keyBy(action.dexTypes, 'id');
    default:
      return state;
  }
}
