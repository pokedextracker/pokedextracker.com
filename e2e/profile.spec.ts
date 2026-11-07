import { createUser, expect, signIn, test } from "./fixtures";

test("creating another dex from the profile", async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}`);

  await page.getByText("Create a New Dex").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#dex_title").fill("Shiny Hunt");
  await dialog.getByRole("combobox").selectOption({ label: "Legends: Z-A" });
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page).toHaveURL(`/u/${user.username}/shiny-hunt`);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );

  await page.goto(`/u/${user.username}`);
  await expect(page.getByRole("link", { name: "Living Dex" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shiny Hunt" })).toBeVisible();
});

// A title with nothing slug-friendly in it gets the slug of its base64, which
// the browser computes, so this checks that path in each browser. The slug is
// what the slug package (2.1.1) gave with symbol names off.
test("renaming a dex changes its URL", async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}`);

  await page.getByTestId("dex-edit-toggle").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#dex_title").fill("ポケモン ★");
  await expect(dialog).toContainText(
    `/u/${user.username}/44od44kx44oi44oziokyhq`,
  );
  await expect(dialog).toContainText(
    "The old URL to your dex will not function anymore.",
  );
  await dialog.getByRole("button", { name: "Edit" }).click();
  await dialog.getByRole("button", { name: "Confirm Edit" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "ポケモン ★" }).click();
  await expect(page).toHaveURL(`/u/${user.username}/44od44kx44oi44oziokyhq`);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
});
