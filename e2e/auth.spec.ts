import type { Page } from "@playwright/test";

import {
  createUser,
  expect,
  PASSWORD,
  SERVER_ERROR,
  test,
  uniqueUsername,
} from "./fixtures";

test("registering creates the first dex and signs in", async ({ page }) => {
  const username = uniqueUsername();
  await page.goto("/register");

  await page.locator("#username").fill(username);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#password_confirm").fill(PASSWORD);
  await page.locator("#dex_title").fill("Lumiose Dex");
  await page.getByRole("combobox").selectOption({ label: "Legends: Z-A" });
  await page.getByRole("button", { name: "Let's go!" }).click();

  await expect(page).toHaveURL(`/u/${username}/lumiose-dex`);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
  await expect(page.getByTestId("nav-dropdown")).toContainText(username);
});

test("signing in and out", async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto("/login");

  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Let's go!" }).click();

  await expect(page).toHaveURL(`/u/${user.username}`);
  await page.getByTestId("nav-dropdown").hover();
  await page.getByText("Sign Out").click();

  await expect(
    page.locator("nav").getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.localStorage.getItem("token")),
  ).toBeNull();
});

test("a wrong password is turned away", async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto("/login");

  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill("not-the-password");
  await page.getByRole("button", { name: "Let's go!" }).click();

  await expect(page.getByTestId("alert-error")).toHaveText(
    "password is invalid",
  );
  await expect(page).toHaveURL("/login");
});

// Rewrites a token's payload. The frontend only decodes tokens, so this is
// enough to stand in for a login from another database, like staging's.
function withPayload(token: string, change: Record<string, unknown>) {
  const [header, payload, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  const changed = Buffer.from(JSON.stringify({ ...claims, ...change }));
  return [header, changed.toString("base64url"), signature].join(".");
}

async function plantToken(page: Page, token: string) {
  await page.goto("/");
  await page.evaluate((value) => localStorage.setItem("token", value), token);
}

test("a token whose user has a different id here counts as signed out", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await plantToken(page, withPayload(user.token, { id: 987654 }));
  await page.goto(`/u/${user.username}/${user.slug}`);

  await expect(
    page.locator("nav").getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("pokemon").filter({ hasText: "Chikorita" }),
  ).toHaveAttribute("data-read-only", "true");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("token")))
    .toBeNull();
});

test("a token for a user who doesn't exist here counts as signed out", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await plantToken(page, withPayload(user.token, { username: "e2e_nobody" }));
  await page.goto(`/u/${user.username}`);

  await expect(
    page.locator("nav").getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("token")))
    .toBeNull();
});

test("logging in again after the database changed sticks", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  // The user as it was before a reset, with another id, gets cached and the
  // token that doesn't match it is cleared.
  await page.route(`**/api/users/${user.username}`, async (route) => {
    const response = await route.fetch();
    route.fulfill({
      response,
      json: { ...(await response.json()), id: 987654 },
    });
  });
  await plantToken(page, user.token);
  await page.goto(`/u/${user.username}`);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("token")))
    .toBeNull();

  // In-app, so the user cached with the old id is still there.
  await page.unroute(`**/api/users/${user.username}`);
  await page
    .locator("nav")
    .getByRole("link", { name: "Login", exact: true })
    .click();
  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Let's go!" }).click();

  await expect(page).toHaveURL(`/u/${user.username}`);
  // The dropdown lists the dexes once the user fetched again matches the
  // token, which is when a mismatch would have signed it out.
  await expect(page.getByTestId("nav-dropdown-menu")).toContainText(
    "Living Dex",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("token")),
  ).not.toBeNull();
});

// A server error loading the signed-in user doesn't sign them out, and the nav
// still gets them to their account (which says it couldn't load) or out.
test("a server error loading the user keeps the session and a way out", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  const other = await createUser(request);
  await plantToken(page, user.token);
  await page.route(`**/api/users/${user.username}`, (route) =>
    route.fulfill(SERVER_ERROR),
  );
  await page.goto(`/u/${other.username}`);

  // After React Query's retries.
  const dropdown = page.getByTestId("nav-dropdown");
  await expect(dropdown).toContainText(user.username, { timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(
    user.token,
  );

  await dropdown.hover();
  await page
    .getByTestId("nav-dropdown-menu")
    .getByText("Account Settings")
    .click();
  await expect(page.getByText("We've been notified")).toBeVisible();

  await page.getByTestId("nav-dropdown").hover();
  await page.getByTestId("nav-dropdown-menu").getByText("Sign Out").click();
  await expect(
    page.locator("nav").getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
});
