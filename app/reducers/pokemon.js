import { CLEAR_POKEMON, SET_POKEMON } from '../actions/pokemon';

export function pokemon (state = {}, action) {
  switch (action.type) {
    case SET_POKEMON:
      return {
        ...state,
        [action.pokemon.id]: action.pokemon,
      };
    case CLEAR_POKEMON:
      return {};
    default:
      return state;
  }
}
