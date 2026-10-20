import { stringify } from "qs";

import { Config } from "../../config";
import { localStorage } from "./local-storage";
import { TOKEN_KEY } from "./token";

export class PokedexTrackerError extends Error {
  public response: Response;

  constructor(message: string, response: Response) {
    super(message);
    this.response = response;
  }
}

// isNotFound reports whether a failed request was a 404. Errors that never got
// a response, like a dropped connection, have no status.
export function isNotFound(error: { response?: Response } | null): boolean {
  return error?.response?.status === 404;
}

async function handleResponse(response: Response) {
  const json = await response.json();
  if (response.status >= 200 && response.status < 300) {
    return json;
  }

  throw new PokedexTrackerError(json.error.message, response);
}

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
    "X-Version": Config.VERSION,
  };
}

export const API = {
  async delete<T, U = unknown>(path: string, payload?: U): Promise<T> {
    const response = await fetch(Config.API_HOST + path, {
      method: "DELETE",
      body: JSON.stringify(payload),
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  async get<T, U = unknown>(path: string, params?: U): Promise<T> {
    const query = stringify(params);
    const response = await fetch(
      `${Config.API_HOST}${path}${query ? `?${query}` : ""}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },
  async post<T, U = unknown>(path: string, payload: U): Promise<T> {
    const response = await fetch(Config.API_HOST + path, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
