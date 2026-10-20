import { createUser, expect, test } from "./fixtures";

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
test("a profile that fails to load says so", async ({ page }) => {
  await page.route("**/api/users/e2e_down", (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.goto("/u/e2e_down");

  // After React Query's retries.
  await expect(page.getByText("Couldn't load this profile")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: /404 Error/ })).toHaveCount(0);
});
