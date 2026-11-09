import type { Page } from "@playwright/test";

import {
  createUser,
  expect,
  PASSWORD,
  SERVER_ERROR,
  signIn,
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

// expectSignedOut checks the page counts as signed out, and that the token it
// was given is cleared.
async function expectSignedOut(page: Page) {
  await expect(
    page.locator("nav").getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("token")))
    .toBeNull();
}

test("a token whose user has a different id here counts as signed out", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await plantToken(page, withPayload(user.token, { id: 987654 }));
  await page.goto(`/u/${user.username}/${user.slug}`);

  await expectSignedOut(page);
  await expect(
    page.getByTestId("pokemon").filter({ hasText: "Chikorita" }),
  ).toHaveAttribute("data-read-only", "true");
});

test("a token for a user who doesn't exist here counts as signed out", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await plantToken(page, withPayload(user.token, { username: "e2e_nobody" }));
  await page.goto(`/u/${user.username}`);

  await expectSignedOut(page);
});

test("a token that can't be read counts as signed out", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await plantToken(page, "not-a-token");
  await page.goto(`/u/${user.username}`);

  await expectSignedOut(page);
});

// A token's payload is base64url, whose - and _ plain base64 doesn't have.
test("a token with base64url's own characters still signs in", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  // Padding the payload with ?s shifts where its bytes fall, and a ? in the
  // right place encodes as _, so a few at most give a payload with one.
  let token = user.token;
  for (let i = 1; !/[-_]/.test(token.split(".")[1]); i++) {
    expect(i, "a payload with - or _").toBeLessThan(10);
    token = withPayload(user.token, { note: "?".repeat(i) });
  }
  await plantToken(page, token);
  await page.goto(`/u/${user.username}`);

  await expect(page.getByTestId("nav-dropdown")).toBeVisible();
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

// Tabs share the saved token, so signing in or out in one, or deleting the
// account there, carries over to the others without a reload.
test.describe("other tabs", () => {
  const loginLink = (page: Page) =>
    page.locator("nav").getByRole("link", { name: "Login", exact: true });

  test("signing out in one tab signs the others out", async ({
    context,
    page,
    request,
  }) => {
    const user = await createUser(request);
    await signIn(page, user);
    await page.goto(`/u/${user.username}/${user.slug}`);
    await expect(page.getByTestId("nav-dropdown")).toContainText(user.username);

    const other = await context.newPage();
    await other.goto(`/u/${user.username}`);
    await other.getByTestId("nav-dropdown").hover();
    await other.getByText("Sign Out").click();
    await expect(loginLink(other)).toBeVisible();

    await expect(loginLink(page)).toBeVisible();
    // Signed out, the tiles can't be marked.
    await expect(page.getByTestId("pokemon").first()).toHaveAttribute(
      "data-read-only",
      "true",
    );
  });

  test("deleting the account in one tab signs the others out", async ({
    context,
    page,
    request,
  }) => {
    const user = await createUser(request);
    await signIn(page, user);
    await page.goto(`/u/${user.username}/${user.slug}`);
    await expect(page.getByTestId("nav-dropdown")).toContainText(user.username);

    const other = await context.newPage();
    await other.goto("/account");
    await other.getByRole("button", { name: "Delete Account" }).click();
    await other
      .getByLabel(`Type ${user.username} to confirm`)
      .fill(user.username);
    await other.getByRole("button", { name: "Delete My Account" }).click();
    await expect(other.getByTestId("alert-success")).toHaveText(
      "Your account has been deleted.",
    );

    await expect(loginLink(page)).toBeVisible();
  });

  // The other tab still has the deleted account cached, under the old id. It
  // fetches the user again rather than calling the new sign-in stale, which
  // would clear it everywhere.
  test("registering a deleted account's username again keeps the new sign-in", async ({
    context,
    page,
    request,
  }) => {
    const user = await createUser(request);
    await signIn(page, user);
    await page.goto(`/u/${user.username}/${user.slug}`);
    await expect(page.getByTestId("nav-dropdown")).toContainText(user.username);

    const other = await context.newPage();
    await other.goto("/account");
    await other.getByRole("button", { name: "Delete Account" }).click();
    await other
      .getByLabel(`Type ${user.username} to confirm`)
      .fill(user.username);
    await other.getByRole("button", { name: "Delete My Account" }).click();
    await expect(loginLink(page)).toBeVisible();

    const newcomer = await createUser(request, { username: user.username });
    const refetched = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/users/${user.username}`) &&
        response.status() === 200,
    );
    await other.evaluate(
      (token) => localStorage.setItem("token", token),
      newcomer.token,
    );
    await refetched;

    await expect(page.getByTestId("nav-dropdown")).toContainText(user.username);
    // Its check of the refetched user has run by now, and it kept the sign-in.
    await expect(loginLink(page)).toHaveCount(0);
    await expect(loginLink(other)).toHaveCount(0);
    expect(await other.evaluate(() => localStorage.getItem("token"))).toBe(
      newcomer.token,
    );
  });

  test("signing in in one tab signs the others in", async ({
    context,
    page,
    request,
  }) => {
    const user = await createUser(request);
    await page.goto(`/u/${user.username}/${user.slug}`);
    await expect(loginLink(page)).toBeVisible();

    const other = await context.newPage();
    await other.goto("/login");
    await other.locator("#username").fill(user.username);
    await other.locator("#password").fill(PASSWORD);
    await other.getByRole("button", { name: "Let's go!" }).click();
    await expect(other).toHaveURL(`/u/${user.username}`);

    await expect(page.getByTestId("nav-dropdown")).toContainText(user.username);
    // And this tab's saves go out with the token.
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/captures") &&
        response.request().method() === "POST",
    );
    await page
      .getByTestId("pokemon")
      .filter({ hasText: "Chikorita" })
      .getByTestId("set-captured")
      .click();
    expect((await saved).status()).toBe(200);
  });
});

// A save goes out with the tab's own token, even if the saved one reads as
// empty for a moment. Removing it from within the tab fires no storage event,
// so the tab still counts as signed in, like the iPhone in Sentry FRONTEND-7.
test("a save uses the tab's token even when the saved one is missing", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  await expect(page.getByTestId("nav-dropdown")).toContainText(user.username);

  await page.evaluate(() => localStorage.removeItem("token"));
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/captures") &&
      response.request().method() === "POST",
  );
  await page
    .getByTestId("pokemon")
    .filter({ hasText: "Chikorita" })
    .getByTestId("set-captured")
    .click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByTestId("save-error-banner")).toHaveCount(0);
});
