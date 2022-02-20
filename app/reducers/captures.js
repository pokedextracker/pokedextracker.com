import { MARK_CAPTURED, MARK_PENDING, SET_CAPTURES } from '../actions/capture';

export function captures (state = {}, action) {
  switch (action.type) {
    case SET_CAPTURES:
      return {
        ...state,
        [action.username]: {
          ...state[action.username],
          dexesBySlug: {
            [action.slug]: {
              ...state[action.username].dexesBySlug[action.slug],
              captures: action.captures
            }
          }
        }
      };
    case MARK_PENDING:
      const pendingState = {
        ...state,
        [action.username]: {
          ...state[action.username],
          dexesBySlug: {
            [action.slug]: {
              ...state[action.username].dexesBySlug[action.slug],
              captures: state[action.username].dexesBySlug[action.slug].captures.slice()
            }
          }
        }
      };
      const pendingIndex = pendingState[action.username].dexesBySlug[action.slug].captures.findIndex((c) => c.pokemon.id === action.pokemon[0]);
      for (let i = pendingIndex, count = 0; count < action.pokemon.length; i++) {
        if (action.pokemon.indexOf(pendingState[action.username].dexesBySlug[action.slug].captures[i].pokemon.id) !== -1) {
          pendingState[action.username].dexesBySlug[action.slug].captures[i].captured = false;
          pendingState[action.username].dexesBySlug[action.slug].captures[i].pending = true;
          count++;
        }
      }
      return pendingState;
    case MARK_CAPTURED:
      const newState = {
        ...state,
        [action.username]: {
          ...state[action.username],
          dexesBySlug: {
            [action.slug]: {
              ...state[action.username].dexesBySlug[action.slug],
              captures: state[action.username].dexesBySlug[action.slug].captures.slice()
            }
          }
        }
      };
      const index = newState[action.username].dexesBySlug[action.slug].captures.findIndex((c) => c.pokemon.id === action.pokemon[0]);
      for (let i = index, count = 0; count < action.pokemon.length; i++) {
        if (action.pokemon.indexOf(newState[action.username].dexesBySlug[action.slug].captures[i].pokemon.id) !== -1) {
          newState[action.username].dexesBySlug[action.slug].captures[i].captured = action.captured;
          newState[action.username].dexesBySlug[action.slug].captures[i].pending = false;
          count++;
        }
      }
      return newState;
    default:
      return state;
  }
}
