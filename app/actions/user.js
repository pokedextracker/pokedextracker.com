import { push } from 'react-router-redux';
import slug     from 'slug';

import { API }          from '../utils/api';
import { Config }       from '../../config';
import { checkVersion } from './utils';
import { setToken }     from './session';

export const SET_USER         = 'SET_USER';
export const SET_CURRENT_USER = 'SET_CURRENT_USER';

export function createUser (payload) {
  const { password, password_confirm, title, username } = payload;
  payload = Object.assign({ referrer: document.referrer }, payload);

  return (dispatch) => {
    return Promise.resolve()
    .then(() => {
      if (password !== password_confirm) {
        throw new Error('passwords need to match');
      }

      Reflect.deleteProperty(payload, 'password_confirm');

      return API.post(`${Config.API_HOST}/users`, payload);
    })
    .then(({ token }) => {
      dispatch(setToken(token));
      dispatch(push(`/u/${username}/${slug(title, { lower: true })}`));
    });
  };
}

export function retrieveUser (username) {
  return (dispatch) => {
    dispatch(checkVersion());

    return API.get(`${Config.API_HOST}/users/${username}`);
  };
}

export function updateUser ({ username, payload }) {
  return (dispatch) => {
    return Promise.resolve()
    .then(() => {
      const { password, password_confirm } = payload;

      if (password !== password_confirm) {
        throw new Error('passwords need to match');
      }

      Reflect.deleteProperty(payload, 'password_confirm');

      return API.post(`${Config.API_HOST}/users/${username}`, payload);
    })
    .then(({ token }) => {
      dispatch(setToken(token));
    });
  };
}

export function setCurrentUser (username) {
  return { type: SET_CURRENT_USER, username };
}

export function setUser (user) {
  return { type: SET_USER, user };
}
