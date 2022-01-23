import groupBy from 'lodash/groupBy';

import { SET_DEX_TYPES } from '../actions/dex-type';

export function dexTypesByGameFamilyId (state = {}, action) {
  switch (action.type) {
    case SET_DEX_TYPES:
      return groupBy(action.dexTypes, 'game_family_id');
    default:
      return state;
  }
}
