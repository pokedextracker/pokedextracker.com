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

// Umami's tracker isn't on the page in tests, so a stand-in collects events.
async function recordEvents(page: Page) {
  await page.addInitScript(() => {
    const events: string[] = [];
    (window as unknown as { events: string[] }).events = events;
    (window as unknown as { umami: unknown }).umami = {
      track: (event: string) => events.push(event),
    };
  });
}

test("deleting the account needs its username typed in", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await recordEvents(page);
  await signIn(page, user);
  await page.goto("/account");

  await page.getByRole("button", { name: "Delete Account" }).click();
  const modal = page.getByRole("dialog", { name: "Delete Account" });
  await expect(modal).toContainText(
    `This permanently deletes the account ${user.username}, its profile, its dex, and every capture in it.`,
  );
  await expect(modal).toContainText("This can't be undone");

  const confirm = modal.getByRole("button", { name: "Delete My Account" });
  const input = modal.getByLabel(`Type ${user.username} to confirm`);
  await expect(confirm).toBeDisabled();
  await input.fill(user.username.slice(0, -1));
  await expect(confirm).toBeDisabled();
  await input.fill(user.username.toUpperCase());
  await expect(confirm).toBeDisabled();
  await input.fill(user.username);
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("alert-success")).toHaveText(
    "Your account has been deleted.",
  );
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  expect(
    await page.evaluate(
      () => (window as unknown as { events: string[] }).events,
    ),
  ).toContain("User: delete");

  // It's said once, not again on a reload.
  await page.reload();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  await expect(page.getByTestId("alert-success")).toHaveCount(0);

  await page.goto(`/u/${user.username}`);
  await expect(page.getByRole("heading", { name: /404 Error/ })).toBeVisible();
  const login = await request.post("/api/sessions", {
    data: { username: user.username, password: PASSWORD },
  });
  expect(login.status()).toBe(404);
});

test("the delete modal says how many dexes go with the account", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  const dex = await request.post(`/api/users/${user.username}/dexes`, {
    headers: { Authorization: `Bearer ${user.token}` },
    data: {
      title: "Shiny Dex",
      slug: "shiny-dex",
      shiny: true,
      game: "legends_za",
      dex_type: 23,
    },
  });
  expect(dex.status(), await dex.text()).toBe(200);
  await signIn(page, user);
  await page.goto("/account");

  await page.getByRole("button", { name: "Delete Account" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "its profile, all 2 of its dexes, and every capture in them.",
  );
});

test("going back from the delete modal keeps the account", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto("/account");

  await page.getByRole("button", { name: "Delete Account" }).click();
  await page.getByLabel(`Type ${user.username} to confirm`).fill(user.username);
  await page.getByRole("button", { name: "Go Back" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // What was typed is gone when it opens again.
  await page.getByRole("button", { name: "Delete Account" }).click();
  await expect(page.getByLabel(`Type ${user.username} to confirm`)).toHaveValue(
    "",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const response = await request.get(`/api/users/${user.username}`);
  expect(response.status()).toBe(200);
});

test("a failed delete says why and keeps the account", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto("/account");
  await page.route(`**/api/users/${user.username}`, (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill(SERVER_ERROR)
      : route.fallback(),
  );

  await page.getByRole("button", { name: "Delete Account" }).click();
  await page.getByLabel(`Type ${user.username} to confirm`).fill(user.username);
  await page.getByRole("button", { name: "Delete My Account" }).click();
  await expect(page.getByRole("dialog").getByTestId("alert-error")).toHaveText(
    "Internal Server Error",
  );
  await expect(page).toHaveURL("/account");
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(
    user.token,
  );
});

// Tokens don't expire, so one can outlive its account. Someone who signs up
// with the same username afterward mustn't be reachable with it.
test("a deleted account's token stops working", async ({ request }) => {
  const user = await createUser(request);
  const auth = { Authorization: `Bearer ${user.token}` };

  // Someone else's dex, with captures, which the delete mustn't touch.
  const otherUser = await createUser(request);
  const { dexes } = await (
    await request.get(`/api/users/${otherUser.username}`)
  ).json();
  const marked = await request.post("/api/captures", {
    headers: { Authorization: `Bearer ${otherUser.token}` },
    data: { dex: dexes[0].id, pokemon: [1, 2, 3] },
  });
  expect(marked.status(), await marked.text()).toBe(200);
  const otherCaptured = async () => {
    const response = await request.get(
      `/api/users/${otherUser.username}/dexes/${otherUser.slug}/captures`,
    );
    expect(response.status()).toBe(200);
    const captures: { captured: boolean }[] = await response.json();
    return captures.filter((capture) => capture.captured).length;
  };
  expect(await otherCaptured()).toBe(3);

  const forbidden = await request.delete(`/api/users/${otherUser.username}`, {
    headers: auth,
  });
  expect(forbidden.status()).toBe(403);

  const deleted = await request.delete(`/api/users/${user.username}`, {
    headers: auth,
  });
  expect(deleted.status(), await deleted.text()).toBe(200);

  expect(await otherCaptured()).toBe(3);

  const again = await request.delete(`/api/users/${user.username}`, {
    headers: auth,
  });
  expect(again.status()).toBe(401);
  expect(await again.text()).toContain("deleted_user");

  const newcomer = await createUser(request, { username: user.username });
  const update = await request.post(`/api/users/${user.username}`, {
    headers: auth,
    data: { friend_code_switch: "SW-1234-5678-9012" },
  });
  expect(update.status()).toBe(401);
  expect(await update.text()).toContain("deleted_user");

  const own = await request.post(`/api/users/${newcomer.username}`, {
    headers: { Authorization: `Bearer ${newcomer.token}` },
    data: { friend_code_switch: "SW-1234-5678-9012" },
  });
  expect(own.status(), await own.text()).toBe(200);
});
