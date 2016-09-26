import { combineReducers } from 'redux';
import { routerReducer }   from 'react-router-redux';

import { currentPokemon } from './current-pokemon';
import { currentUser }    from './current-user';
import { error }          from './error';
import { loading }        from './loading';
import { pokemon }        from './pokemon';
import { region }         from './region';
import { session }        from './session';
import { showInfo }       from './show-info';
import { showShare }      from './show-share';
import { token }          from './token';
import { users }          from './users';

export const reducer = combineReducers({
  currentPokemon,
  currentUser,
  error,
  loading,
  pokemon,
  region,
  routing: routerReducer,
  session,
  showInfo,
  showShare,
  token,
  users
});
