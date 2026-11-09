import { stringify } from "qs";

import { Config } from "../../config";
import { localStorage } from "./local-storage";
import { TOKEN_KEY } from "./token";

export class PokedexTrackerError extends Error {
  public response: Response;
  // The API's error code, like "not_found" or "deleted_user".
  public code?: string;

  constructor(message: string, response: Response, code?: string) {
    super(message);
    this.response = response;
    this.code = code;
  }
}

// isNotFound reports whether a failed request was a 404. Errors that never got
// a response, like a dropped connection, have no status.
export function isNotFound(error: { response?: Response } | null): boolean {
  return error?.response?.status === 404;
}

// isDeletedUser reports whether a request failed because the signed-in account
// was deleted, like from another tab or device.
export function isDeletedUser(error: unknown): boolean {
  return error instanceof PokedexTrackerError && error.code === "deleted_user";
}

async function handleResponse(response: Response) {
  const json = await response.json();
  if (response.status >= 200 && response.status < 300) {
    return json;
  }

  throw new PokedexTrackerError(json.error.message, response, json.error.code);
}

// authToken is the token requests are sent with: the tab's own, which
// SessionProvider keeps it in step with. Reading the saved one before
// every request could send none if it ever reads as empty while the tab is
// still signed in, which an iPhone tab back from the background seemed to do
// (Sentry FRONTEND-7). It starts as the saved one, for requests made before
// the session is set up.
let authToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setAuthToken(token: string | null) {
  authToken = token;
}

function getHeaders() {
  return {
    Authorization: authToken ? `Bearer ${authToken}` : "",
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
