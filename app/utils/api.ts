import { stringify } from 'qs';

import { Config } from '../../config';
import { Store } from '../stores';

export class PokedexTrackerError extends Error {
  public response: Response;

  constructor (message: string, response: Response) {
    super(message);
    this.response = response;
  }
}

async function handleResponse (response: Response) {
  const json = await response.json();
  if (response.status >= 200 && response.status < 300) {
    return json;
  }

  throw new PokedexTrackerError(json.error.message, response);
}

function getHeaders () {
  return {
    Authorization: `Bearer ${Store.getState().token}`,
    'Content-Type': 'application/json',
    'X-Version': Config.VERSION,
  };
}

export const API = {
  async delete<T, U = any> (path: string, payload?: U): Promise<T> {
    const response = await fetch(Config.API_HOST + path, {
      method: 'DELETE',
      body: JSON.stringify(payload),
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  async get<T, U = any> (path: string, params?: U): Promise<T> {
    const query = stringify(params);
    const response = await fetch(`${Config.API_HOST}${path}${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  async post<T, U = any> (path: string, payload: U): Promise<T> {
    const response = await fetch(Config.API_HOST + path, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
