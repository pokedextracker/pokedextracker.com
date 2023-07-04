export const SET_NIGHT_MODE = 'SET_NIGHT_MODE';
export const SET_NOTIFICATION = 'SET_NOTIFICATION';
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

export function setNotification (notification) {
  return { type: SET_NOTIFICATION, notification };
}

export function setReload (reload) {
  return { type: SET_RELOAD, reload };
}

export function setNightMode (nightMode) {
  return { type: SET_NIGHT_MODE, nightMode };
}
