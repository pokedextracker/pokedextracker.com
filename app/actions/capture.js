import { API } from '../utils/api';

export const MARK_PENDING = 'MARK_PENDING';
export const MARK_CAPTURED = 'MARK_CAPTURED';
export const SET_CAPTURES = 'SET_CAPTURES';

export function createCaptures ({ payload, slug, username }) {
  return (dispatch) => {
    dispatch(markPending(payload.pokemon, slug, username));

    return API.post('/captures', payload)
    .then(() => dispatch(markCaptured(true, payload.pokemon, slug, username)));
  };
}

export function deleteCaptures ({ payload, slug, username }) {
  return (dispatch) => {
    dispatch(markPending(payload.pokemon, slug, username));

    return API.delete('/captures', payload)
    .then(() => dispatch(markCaptured(false, payload.pokemon, slug, username)));
  };
}

export function setCaptures (captures, slug, username) {
  return { type: SET_CAPTURES, captures, slug, username };
}

export function markPending (pokemon, slug, username) {
  return { type: MARK_PENDING, pokemon, slug, username };
}

export function markCaptured (captured, pokemon, slug, username) {
  return { type: MARK_CAPTURED, captured, pokemon, slug, username };
}
