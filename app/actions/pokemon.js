import { API } from '../utils/api';

export const CLEAR_POKEMON = 'CLEAR_POKEMON';
export const SET_POKEMON = 'SET_POKEMON';
export const SET_CURRENT_POKEMON = 'SET_CURRENT_POKEMON';

export function retrievePokemon (id, query) {
  return (dispatch) => {
    return API.get(`/pokemon/${id}`, query)
    .then((pokemon) => dispatch(setPokemon(pokemon)));
  };
}

export function clearPokemon () {
  return { type: CLEAR_POKEMON };
}

export function setCurrentPokemon (pokemon) {
  return { type: SET_CURRENT_POKEMON, pokemon };
}

export function setPokemon (pokemon) {
  return { type: SET_POKEMON, pokemon };
}
