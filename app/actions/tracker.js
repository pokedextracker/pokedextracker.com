export const SET_SHOW_INFO = 'SET_SHOW_INFO';
export const SET_SHOW_SCROLL = 'SET_SHOW_SCROLL';

export function setShowInfo (show) {
  return { type: SET_SHOW_INFO, show };
}

export function setShowScroll (show) {
  return { type: SET_SHOW_SCROLL, show };
}
