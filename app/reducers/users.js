import { MARK_CAPTURED, MARK_PENDING, SET_CAPTURES } from '../actions/capture';
import { SET_DEX }                     from '../actions/dex';
import { SET_USER }                    from '../actions/user';
import { dexes }                       from '../reducers/dexes';

export function users (state = {}, action) {
  switch (action.type) {
    case SET_USER:
      return {
        ...state,
        [action.user.username]: {
          ...action.user,
          dexesBySlug: {}
        }
      };
    case MARK_PENDING:
    case MARK_CAPTURED:
    case SET_CAPTURES:
    case SET_DEX:
      return dexes(state, action);
    default:
      return state;
  }
}
