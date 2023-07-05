export const SET_RELOAD = 'SET_RELOAD';

let VERSION;

export function checkVersion () {
  return (dispatch) => {
    return fetch('/version')
    .then((response) => response.text())
    .then((version) => {
      if (!VERSION) {
        VERSION = version;
      } else if (VERSION !== version) {
        dispatch(setReload(true));
      }
    })
    .catch(() => {});
  };
}

export function setReload (reload) {
  return { type: SET_RELOAD, reload };
}
