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
