import { API } from '../utils/api';
import { setToken } from './session';

export const SET_USER = 'SET_USER';

export function updateUser ({ username, payload }) {
  return (dispatch) => {
    return Promise.resolve()
    .then(() => {
      const { password, password_confirm } = payload;

      if (password !== password_confirm) {
        throw new Error('passwords need to match');
      }

      Reflect.deleteProperty(payload, 'password_confirm');

      return API.post(`/users/${username}`, payload);
    })
    .then(({ token }) => {
      dispatch(setToken(token));
    });
  };
}
