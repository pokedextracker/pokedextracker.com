import { SET_DEX }                     from '../actions/dex';
import { MARK_CAPTURED, MARK_PENDING, SET_CAPTURES } from '../actions/capture';
import { captures }                    from '../reducers/captures';

export function dexes (state = {}, action) {
  switch (action.type) {
    case SET_DEX:
      return {
        ...state,
        [action.username]: {
          ...state[action.username],
          dexesBySlug: {
            ...state[action.username].dexesBySlug,
            [action.dex.slug]: {
              ...action.dex,
              captures: []
            }
          }
        }
      };
    case SET_CAPTURES:
    case MARK_PENDING:
    case MARK_CAPTURED:
      return captures(state, action);
    default:
      return state;
  }
}
