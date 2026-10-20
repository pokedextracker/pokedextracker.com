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
