import type { Page } from "@playwright/test";

import { createUser, expect, SERVER_ERROR, signIn, test } from "./fixtures";

function tile(page: Page, name: string) {
  return page.getByTestId("pokemon").filter({ hasText: name });
}

// toggleCaught clicks a tile and waits for the API to save the change, so a
// reload right after sees it.
async function toggleCaught(page: Page, name: string) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith("/api/captures") && response.ok(),
  );
  await tile(page, name).getByTestId("set-captured").click();
  await saved;
}

test("marking a Pokémon as caught is saved", async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  const progress = page.getByTestId("progress-count");
  await expect(progress).toHaveText("(0 caught, 237 to go)");

  await toggleCaught(page, "Chikorita");
  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-captured",
    "true",
  );
  await expect(progress).toHaveText("(1 caught, 236 to go)");

  await page.reload();
  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-captured",
    "true",
  );
  await expect(progress).toHaveText("(1 caught, 236 to go)");

  await toggleCaught(page, "Chikorita");
  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-captured",
    "false",
  );

  await page.reload();
  await expect(progress).toHaveText("(0 caught, 237 to go)");
  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-captured",
    "false",
  );
});

// A printed dex is just its boxes, in the desktop grid even though a page is
// narrower than the phone breakpoint, with the caught colors and sprites kept.
test("a dex prints as a grid of its boxes", async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.setViewportSize({ width: 740, height: 960 });
  await page.goto(`/u/${user.username}/${user.slug}`);
  const markAll = page.getByRole("button", { name: "Mark All" }).first();
  await expect(markAll).toBeVisible();

  await page.emulateMedia({ media: "print" });
  // Six to a row: the sixth shares the first's row, and the seventh starts
  // the next.
  const first = await tile(page, "Chikorita").boundingBox();
  const sixth = await tile(page, "Emboar").boundingBox();
  const seventh = await tile(page, "Totodile").boundingBox();
  expect(sixth?.y).toBe(first?.y);
  expect(seventh?.y).toBeGreaterThan(first?.y ?? 0);
  expect(seventh?.x).toBe(first?.x);
  await expect(tile(page, "Chikorita")).toHaveCSS(
    "print-color-adjust",
    "exact",
  );
  await expect(page.getByTestId("info-main")).toBeHidden();
  await expect(page.getByPlaceholder(/Search by name/)).toBeHidden();
  await expect(markAll).toBeHidden();
});

test("the info panel shows the chosen Pokémon", async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto(`/u/${user.username}/${user.slug}`);

  await tile(page, "Bayleef").hover();
  await tile(page, "Bayleef").getByTestId("set-info").click();

  await expect(page.getByTestId("info-name")).toHaveText("Bayleef");
  await expect(page.getByTestId("info-main")).toContainText("Chikorita");
  await expect(page.getByTestId("info-main")).toContainText("Level Up to 16");
});

test("someone else's dex is read-only", async ({ page, request }) => {
  const owner = await createUser(request);
  const visitor = await createUser(request);
  await signIn(page, visitor);
  await page.goto(`/u/${owner.username}/${owner.slug}`);
  const writes: string[] = [];
  page.on("request", (sent) => {
    if (sent.url().endsWith("/api/captures")) {
      writes.push(sent.method());
    }
  });

  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-read-only",
    "true",
  );
  await tile(page, "Chikorita").getByTestId("set-captured").click();
  await page.reload();

  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-captured",
    "false",
  );
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
  expect(writes, "requests to change captures").toEqual([]);
});

test("caught Pokémon stay caught after leaving the dex and coming back", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  await toggleCaught(page, "Chikorita");

  // In-app navigation, so the captures cached from the first visit are still
  // around when the dex opens again.
  await page.getByRole("link", { name: `/u/${user.username}` }).click();
  await page.getByTestId("dex-preview").getByRole("link").first().click();

  await expect(tile(page, "Chikorita")).toHaveAttribute(
    "data-captured",
    "true",
  );
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(1 caught, 236 to go)",
  );
});

test("a dex whose captures hit a server error says we've been notified", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await page.route("**/captures", (route) => route.fulfill(SERVER_ERROR));
  await page.goto(`/u/${user.username}/${user.slug}`);

  // After React Query's retries.
  await expect(page.getByText("We've been notified")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: /404 Error/ })).toHaveCount(0);
  // The nav stays, so there's a way out.
  await expect(page.locator("nav")).toBeVisible();
  await expect(page).toHaveTitle("Error | Pokédex Tracker");
});

test("a dex whose captures can't be reached says to refresh", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await page.route("**/captures", (route) => route.abort("timedout"));
  await page.goto(`/u/${user.username}/${user.slug}`);

  await expect(
    page.getByText("Couldn't load this dex. Try refreshing the page."),
  ).toBeVisible({ timeout: 20_000 });
});

test("switching between dexes and back shows each one", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  const created = await request.post(`/api/users/${user.username}/dexes`, {
    headers: { Authorization: `Bearer ${user.token}` },
    data: {
      title: "Second Dex",
      slug: "second-dex",
      shiny: false,
      game: "legends_za",
      dex_type: 23,
    },
  });
  expect(created.status(), await created.text()).toBe(200);
  await signIn(page, user);
  const progress = page.getByTestId("progress-count");

  await page.goto(`/u/${user.username}/${user.slug}`);
  await toggleCaught(page, "Chikorita");
  await expect(progress).toHaveText("(1 caught, 236 to go)");

  // In-app, so the first dex's captures are cached when it opens again.
  const switchTo = async (title: string) => {
    await page.getByTestId("nav-dropdown").hover();
    await page
      .getByTestId("nav-dropdown-menu")
      .getByRole("link", { name: title })
      .click();
  };
  await switchTo("Second Dex");
  await expect(page).toHaveURL(`/u/${user.username}/second-dex`);
  await expect(progress).toHaveText("(0 caught, 237 to go)");
  await switchTo("Living Dex");
  await expect(progress).toHaveText("(1 caught, 236 to go)");
  await page.goBack();
  await expect(progress).toHaveText("(0 caught, 237 to go)");
  await page.goForward();
  await expect(progress).toHaveText("(1 caught, 236 to go)");
});

// A 500 the API didn't send, like a proxy's error page, was never reported.
test("a server error page from outside the API says to refresh", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await page.route("**/captures", (route) =>
    route.fulfill({ status: 500, body: "<html>Internal Server Error</html>" }),
  );
  await page.goto(`/u/${user.username}/${user.slug}`);

  await expect(
    page.getByText("Couldn't load this dex. Try refreshing the page."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("We've been notified")).toHaveCount(0);
});

test("a failed refresh of a loaded user doesn't replace the page", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const user = await createUser(request);
  await page.goto(`/u/${user.username}`);
  await expect(page.getByTestId("dex-preview")).toBeVisible();

  // From here, refreshing the user fails, after React Query's retries.
  await page.route(`**/api/users/${user.username}`, (route) =>
    route.fulfill(SERVER_ERROR),
  );
  await page.getByTestId("dex-preview").getByRole("link").first().click();
  await expect(page.getByTestId("box").first()).toBeVisible();
  await page.waitForTimeout(9_000);
  await expect(page.getByTestId("box").first()).toBeVisible();
  await expect(page.getByText("We've been notified")).toHaveCount(0);

  await page.getByRole("link", { name: `/u/${user.username}` }).click();
  await expect(page.getByTestId("dex-preview")).toBeVisible();
  await page.waitForTimeout(9_000);
  await expect(page.getByTestId("dex-preview")).toBeVisible();
  await expect(page.getByText("We've been notified")).toHaveCount(0);
});
