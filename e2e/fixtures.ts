import { randomBytes } from "crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import { slugOf } from "./slug";

// WebKit reports a request that a navigation cancels (the test moving to
// another page while the app is still fetching) as a page error worded like a
// cross-origin failure. The request belonged to the page being left, so it's
// not a real error. The site and its API share an origin, so a same-origin
// request can't actually fail access control.
export function cancelledByNavigation(error: Error, host: string): boolean {
  const text = `${error.name}: ${error.message}`;
  return (
    text.startsWith("Fetch API cannot load") &&
    text.includes(host) &&
    text.endsWith("due to access control checks.")
  );
}

// Every test runs against the local server only. Anything else the site loads
// (Google Fonts, Analytics) is blocked, so tests don't depend on the network
// or report to real services. Uncaught errors on the page fail the test.
export const test = base.extend({
  page: async ({ baseURL, page }, use) => {
    const { host, origin } = new URL(baseURL!);
    await page.route(
      (url) => url.origin !== origin,
      (route) => route.abort(),
    );

    const errors: Error[] = [];
    page.on("pageerror", (error) => {
      if (!cancelledByNavigation(error, host)) {
        errors.push(error);
      }
    });
    await use(page);
    expect(errors, "uncaught errors on the page").toEqual([]);
  },
});

export { expect };

export const PASSWORD = "e2e-password";

// Tests run in parallel against one database, so each one makes its own users.
export function uniqueUsername(): string {
  return `e2e_${randomBytes(6).toString("hex")}`;
}

export interface CreatedUser {
  username: string;
  token: string;
  slug: string;
}

// createUser registers a user through the API, with a Legends: Z-A regional
// dex, for tests that aren't about registering.
export async function createUser(
  request: APIRequestContext,
  title = "Living Dex",
): Promise<CreatedUser> {
  const username = uniqueUsername();
  const slug = slugOf(title);
  const response = await request.post("/api/users", {
    data: {
      username,
      password: PASSWORD,
      title,
      slug,
      shiny: false,
      game: "legends_za",
      dex_type: 23,
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const { token } = await response.json();
  return { username, token, slug };
}

// signIn starts a session in the browser for a user made with createUser.
export async function signIn(page: Page, user: CreatedUser): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    (token) => window.localStorage.setItem("token", token),
    user.token,
  );
}

// SERVER_ERROR is what the API sends with a 500, for faking one with
// page.route. The API reports those to Rollbar.
export const SERVER_ERROR = {
  status: 500,
  json: {
    error: {
      code: "internal_server_error",
      message: "Internal Server Error",
      status_code: 500,
    },
  },
};
