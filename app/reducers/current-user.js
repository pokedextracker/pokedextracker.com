import { SET_CURRENT_DEX } from '../actions/dex';
import { SET_CURRENT_USER } from '../actions/user';

export function currentUser (state = null, action) {
  switch (action.type) {
    case SET_CURRENT_DEX:
    case SET_CURRENT_USER:
      return action.username;
    default:
      return state;
  }
}
