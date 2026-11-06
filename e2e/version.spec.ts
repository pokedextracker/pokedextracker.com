import type { Page, Route } from "@playwright/test";

import { createUser, expect, signIn, test } from "./fixtures";

// The app checks /version whenever the page becomes visible again (and every
// 30 seconds). When the answer stops matching the build the page loaded with,
// it shows a banner, and the next page change is a full page load.

// fakeDeploy makes /version answer for real until deploy() is called, then
// with a build the page isn't running. deploy() returns once the page has
// seen it: it asks again until the banner shows, since a check already in
// flight (the 30 second timer) can swallow the first ask.
async function fakeDeploy(page: Page) {
  let deployed = false;
  await page.route("**/version", (route) =>
    deployed
      ? route.fulfill({ body: "a-new-build", contentType: "text/plain" })
      : route.continue(),
  );
  return {
    deploy: async () => {
      deployed = true;
      await expect(async () => {
        await checkVersion(page);
        await expect(page.getByTestId("reload-banner")).toBeVisible({
          timeout: 1_000,
        });
      }).toPass();
    },
  };
}

// checkVersion has the page check /version now, as it does whenever it
// becomes visible again.
async function checkVersion(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
}

// markPage tags the loaded page, so a test can tell an in-app page change,
// which keeps the tag, from a full page load, which drops it.
async function markPage(page: Page) {
  await page.evaluate(() => Object.assign(window, { marked: true }));
}

function isMarked(page: Page): Promise<boolean> {
  return page.evaluate(() => "marked" in window);
}

async function goToAccount(page: Page) {
  await page.getByTestId("nav-dropdown").hover();
  await page.getByRole("link", { name: "Account Settings" }).click();
  await expect(page).toHaveURL("/account");
}

test("after a new build is out, the next page change loads it", async ({
  page,
  request,
}) => {
  const { deploy } = await fakeDeploy(page);
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
  await markPage(page);

  // Before a deploy, page changes stay in the app.
  await goToAccount(page);
  expect(await isMarked(page)).toBe(true);

  // Learning of the new build shows the banner, without reloading the page
  // the person is on.
  await deploy();
  expect(await isMarked(page)).toBe(true);

  const loaded = page.waitForEvent("load");
  await page.getByRole("link", { name: "Pokédex Tracker" }).first().click();
  await loaded;
  await expect(page).toHaveURL("/");
  expect(await isMarked(page)).toBe(false);
});

test("a save in flight finishes before the page change reloads", async ({
  page,
  request,
}) => {
  const { deploy } = await fakeDeploy(page);
  const user = await createUser(request);
  await signIn(page, user);
  const tracker = `/u/${user.username}/${user.slug}`;
  await page.goto(tracker);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
  await deploy();
  await markPage(page);

  // Hold the save until the page has changed.
  let heldSave: Route | undefined;
  let saveStarted!: () => void;
  const started = new Promise<void>((resolve) => (saveStarted = resolve));
  await page.route("**/api/captures", (route) => {
    if (heldSave || route.request().method() === "GET") {
      return route.continue();
    }
    heldSave = route;
    saveStarted();
  });
  await page
    .getByTestId("pokemon")
    .filter({ hasText: "Chikorita" })
    .getByTestId("set-captured")
    .click();
  await started;

  await goToAccount(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Account",
  );
  expect(await isMarked(page), "no reload while saving").toBe(true);

  // Coming back before the save finishes still counts as having left.
  await page.goBack();
  await expect(page).toHaveURL(tracker);
  expect(await isMarked(page), "no reload while saving").toBe(true);

  const loaded = page.waitForEvent("load");
  await heldSave!.continue();
  await loaded;
  await expect(page).toHaveURL(tracker);
  expect(await isMarked(page)).toBe(false);

  await expect(page.getByTestId("progress-count")).toHaveText(
    "(1 caught, 236 to go)",
  );
});

test("a page that isn't a version, like a captive portal's, isn't a new build", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
  await markPage(page);

  for (const answer of [
    { status: 200, contentType: "text/html", body: "<h1>Sign in</h1>" },
    { status: 502, contentType: "text/html", body: "<h1>Bad Gateway</h1>" },
  ]) {
    await page.route("**/version", (route) => route.fulfill(answer));
    const checked = page.waitForResponse("**/version");
    await checkVersion(page);
    await checked;
    await page.unroute("**/version");
  }

  // Were either taken for a new build, this page change would reload.
  await goToAccount(page);
  await expect(page.getByTestId("reload-banner")).toHaveCount(0);
  expect(await isMarked(page)).toBe(true);
});

test("the banner's link reloads from the keyboard", async ({
  page,
  request,
}) => {
  const { deploy } = await fakeDeploy(page);
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Account",
  );
  await deploy();
  const banner = page.getByTestId("reload-banner");
  await markPage(page);

  const loaded = page.waitForEvent("load");
  await banner
    .getByRole("link", { name: "Refresh your browser" })
    .press("Enter");
  await loaded;
  await expect(page).toHaveURL("/account");
  expect(await isMarked(page)).toBe(false);
});

test("the home page shows the new version banner too", async ({ page }) => {
  const { deploy } = await fakeDeploy(page);
  const firstCheck = page.waitForResponse("**/version");
  await page.goto("/");
  await firstCheck;
  const banner = page.getByTestId("reload-banner");
  await expect(banner).toHaveCount(0);

  await deploy();
  await expect(banner).toBeVisible();
});
