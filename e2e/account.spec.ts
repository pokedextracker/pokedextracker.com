import {
  createUser,
  expect,
  PASSWORD,
  signIn,
  test,
  uniqueUsername,
} from "./fixtures";

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
  // Phones show a number pad for them.
  for (const id of ["#friend_code_3ds", "#friend_code_switch"]) {
    await expect(page.locator(id)).toHaveAttribute("inputmode", "numeric");
  }

  await page.locator("#friend_code_3ds").pressSequentially("1a2b3-4567890123");
  await expect(page.locator("#friend_code_3ds")).toHaveValue("1234-5678-9012");

  await page
    .locator("#friend_code_switch")
    .pressSequentially("sw-1234x5678-90123");
  await expect(page.locator("#friend_code_switch")).toHaveValue(
    "SW-1234-5678-9012",
  );
});

test("changing the password signs in with the new one", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto("/account");

  await page.getByRole("button", { name: "Change" }).click();
  await page.getByLabel("New Password", { exact: true }).fill("new-password");
  await page.getByLabel("Confirm New Password").fill("new-password");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("alert-success")).toHaveText(
    "Account settings saved!",
  );

  const oldPassword = await request.post("/api/sessions", {
    data: { username: user.username, password: PASSWORD },
  });
  expect(oldPassword.status()).toBe(422);
  expect(await oldPassword.text()).toContain("invalid_password");
  const newPassword = await request.post("/api/sessions", {
    data: { username: user.username, password: "new-password" },
  });
  expect(newPassword.status(), await newPassword.text()).toBe(200);
});

// Usernames can be 20 characters, which is wider than a phone at the size the
// account and profile headings use, so they have to wrap to stay on screen.
// The nav cuts it off instead, and the last check catches the page scrolling
// sideways if it doesn't.
test("a long username stays on a phone's screen", async ({ page, request }) => {
  const user = await createUser(request, { username: uniqueUsername(20) });
  await signIn(page, user);
  await page.setViewportSize({ width: 320, height: 700 });

  for (const path of ["/account", `/u/${user.username}`]) {
    await page.goto(path);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText(user.username);
    const box = await heading.boundingBox();
    expect(box?.x, path).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0), path).toBeLessThanOrEqual(320);
    expect(
      await heading.evaluate((h) => h.scrollWidth <= h.clientWidth),
      path,
    ).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      `${path} scrolls sideways`,
    ).toBe(true);
  }
});
