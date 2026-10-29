import { createUser, expect, signIn, test } from "./fixtures";

test("saving a friend code shows it on the profile", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto("/account");

  await page.locator("#friend_code_switch").fill("SW-1234-5678-9012");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("alert-success")).toHaveText(
    "Account settings saved!",
  );

  await page.goto(`/u/${user.username}`);
  await expect(page.getByText("SW-1234-5678-9012")).toBeVisible();
});

// A friend code is only ever digits after its SW-, so anything else typed in
// is dropped, along with digits past the 12th.
test("friend codes keep only their digits", async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto("/account");

  await page.locator("#friend_code_3ds").pressSequentially("1a2b3-4567890123");
  await expect(page.locator("#friend_code_3ds")).toHaveValue("1234-5678-9012");

  await page
    .locator("#friend_code_switch")
    .pressSequentially("sw-1234x5678-90123");
  await expect(page.locator("#friend_code_switch")).toHaveValue(
    "SW-1234-5678-9012",
  );
});
