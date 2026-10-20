import { createUser, expect, SERVER_ERROR, test } from "./fixtures";

test("an unknown page shows the not found page", async ({ page }) => {
  await page.goto("/this/page/does/not/exist");

  await expect(page.getByRole("heading", { name: /404 Error/ })).toBeVisible();
});

test("a user who doesn't exist shows the not found page", async ({ page }) => {
  await page.goto("/u/e2e_nobody");

  await expect(page.getByRole("heading", { name: /404 Error/ })).toBeVisible();
});

// The dex's captures 404 along with it, and the page used to wait on them
// forever.
test("a dex that doesn't exist shows the not found page", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await page.goto(`/u/${user.username}/no-such-dex`);

  await expect(page.getByRole("heading", { name: /404 Error/ })).toBeVisible();
});

test("a dex of a user who doesn't exist shows the not found page", async ({
  page,
}) => {
  await page.goto("/u/e2e_nobody/living-dex");

  await expect(page.getByRole("heading", { name: /404 Error/ })).toBeVisible();
});

// Only a missing user or dex is "not found". Any other failure says it
// couldn't load, rather than claiming it doesn't exist.
test("a profile that hits a server error says we've been notified", async ({
  page,
}) => {
  await page.route("**/api/users/e2e_down", (route) =>
    route.fulfill(SERVER_ERROR),
  );
  await page.goto("/u/e2e_down");

  // After React Query's retries.
  await expect(page.getByText("We've been notified")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: /404 Error/ })).toHaveCount(0);
  // The nav stays, so there's a way out.
  await expect(page.locator("nav")).toBeVisible();
  await expect(page).toHaveTitle("Error | Pokédex Tracker");
});

test("a profile that can't be reached says to refresh", async ({ page }) => {
  await page.route("**/api/users/e2e_down", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("/u/e2e_down");

  await expect(
    page.getByText("Couldn't load this profile. Try refreshing the page."),
  ).toBeVisible({ timeout: 20_000 });
});

test("a dex that doesn't exist has the not found title", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await page.goto(`/u/${user.username}/no-such-dex`);

  await expect(page.getByRole("heading", { name: /404 Error/ })).toBeVisible();
  await expect(page).toHaveTitle("404 Not Found | Pokédex Tracker");
});
