import type { Locator, Page } from "@playwright/test";

import { SERVER_ERROR } from "../fixtures";
import { slugOf } from "../slug";
import { expect, hover, scrollToTop, settle, signIn, test } from "./fixtures";
import { USERS } from "./setup";

const ash = USERS.ash.username;
const misty = USERS.misty.username;
const brock = USERS.brock.username;
const gary = USERS.gary.username;
const dawn = USERS.dawn.username;
const livingDex = `/u/${ash}/${slugOf("Living Dex")}`;
const waterDex = `/u/${misty}/${slugOf("Water Dex")}`;
const hisuiDex = `/u/${dawn}/${slugOf("Hisui Dex")}`;

// uncaught is the first tile on the page that isn't caught.
function uncaught(page: Page): Locator {
  return page.locator('[data-testid="pokemon"][data-captured="false"]').first();
}

// Each test opens one page in one state and screenshots it: the whole page
// where it scrolls as a whole, and just the visible window for modals, the
// nav dropdown, and the tracker, which scrolls inside its own panes.

test.describe("signed out", () => {
  test("home", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await expect(page).toHaveScreenshot("home.png", { fullPage: true });
  });

  test("login", async ({ page }) => {
    await page.goto("/login");
    await settle(page);
    await expect(page).toHaveScreenshot("login.png", { fullPage: true });
  });

  test("login with a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill(ash);
    await page.locator("#password").fill("not-the-password");
    await page.getByRole("button", { name: "Let's go!" }).click();
    await expect(page.getByTestId("alert-error")).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("login-error.png", { fullPage: true });
  });

  test("register", async ({ page }) => {
    await page.goto("/register");
    await settle(page);
    await expect(page).toHaveScreenshot("register.png", { fullPage: true });
  });

  test("register with mismatched passwords", async ({ page, browserName }) => {
    await page.goto("/register");
    await page.locator("#username").fill("visual_new");
    await page.locator("#password").fill("visual-password");
    await page.locator("#password_confirm").fill("something-else");
    await page.locator("#dex_title").fill("Living Dex");
    await page.getByRole("button", { name: "Let's go!" }).click();
    await expect(page.getByTestId("alert-error")).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("register-error.png", {
      fullPage: true,
      // Firefox draws the night mode icon a pixel higher or lower on this
      // page from one load to the next. The icon is checked in every other
      // screenshot of the nav.
      mask:
        browserName === "firefox"
          ? [page.getByTestId("night-mode-toggle")]
          : [],
    });
  });

  test("not found", async ({ page }) => {
    await page.goto("/this/page/does/not/exist");
    await settle(page);
    await expect(page).toHaveScreenshot("not-found.png", { fullPage: true });
  });
});

test.describe("profile", () => {
  test("own profile", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await expect(
      page.getByTestId("dex-preview").filter({
        hasText: "Shiny Hunt",
      }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("profile-own.png", { fullPage: true });
  });

  test("someone else's profile", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${misty}`);
    await expect(
      page.getByTestId("dex-preview").filter({
        hasText: "Water Dex",
      }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("profile-other.png", {
      fullPage: true,
    });
  });

  test("profile that fails to load", async ({ page }) => {
    await page.route(`**/api/users/${misty}`, (route) =>
      route.fulfill(SERVER_ERROR),
    );
    await page.goto(`/u/${misty}`);
    // After React Query's retries.
    await expect(page.getByText("We've been notified")).toBeVisible({
      timeout: 20_000,
    });
    await settle(page);
    await expect(page).toHaveScreenshot("profile-load-error.png");
  });

  test("create dex modal", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await page.getByText("Create a New Dex").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await settle(page);
    await scrollToTop(page);
    await expect(page).toHaveScreenshot("dex-create.png");
  });

  test("edit dex modal", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await page.getByTestId("dex-edit-toggle").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await settle(page);
    await scrollToTop(page);
    await expect(page).toHaveScreenshot("dex-edit.png");
  });

  test("delete dex confirmation", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await page.getByTestId("dex-edit-toggle").first().click();
    const dialog = page.getByRole("dialog");
    // The trash icon, the first link in the modal.
    await dialog.locator("a").first().click();
    await expect(dialog.getByText("Are you sure?")).toBeVisible();
    await settle(page);
    await scrollToTop(page);
    await expect(page).toHaveScreenshot("dex-delete-confirm.png");
  });

  test("edit dex confirmation", async ({ page }) => {
    await signIn(page, gary);
    await page.goto(`/u/${gary}`);
    await page.getByTestId("dex-edit-toggle").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#dex_title").fill("Renamed Dex");
    await dialog.getByRole("button", { name: "Edit" }).click();
    await expect(dialog.getByRole("button", { name: /Confirm/ })).toBeVisible();
    await settle(page);
    await scrollToTop(page);
    await expect(page).toHaveScreenshot("dex-edit-confirm.png");
  });
});

test.describe("tracker", () => {
  test("own dex", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    await settle(page);
    await expect(page).toHaveScreenshot("dex-own.png");
  });

  test("a box further down", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    const box = page.getByTestId("box").nth(2);
    await box.scrollIntoViewIfNeeded();
    await settle(page);
    await expect(box).toHaveScreenshot("dex-box.png");
  });

  // The info panel starts open on a desktop and collapsed on a phone, so
  // this is the other state on each.
  test("info panel toggled", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    const info = page.getByTestId("info");
    const wasCollapsed = await info.getAttribute("data-collapsed");
    await page.getByTestId("info-toggle").click();
    await expect(info).toHaveAttribute(
      "data-collapsed",
      String(wasCollapsed !== "true"),
    );
    await settle(page);
    await expect(page).toHaveScreenshot("dex-info-toggled.png");
  });

  // Its icons sit in circles, gray behind an uncaught one and white behind a
  // caught one, as do the info panel's.
  test("legends: arceus dex", async ({ page }) => {
    await signIn(page, dawn);
    await page.goto(hisuiDex);
    await expect(page.getByTestId("progress-count")).toContainText("3 caught");
    await settle(page);
    await expect(page).toHaveScreenshot("dex-legends-arceus.png");
  });

  test("tile hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    // In view first, so the screenshot doesn't scroll another tile under the
    // mouse.
    await page.getByTestId("box").first().scrollIntoViewIfNeeded();
    await settle(page);
    await hover(uncaught(page));
    await expect(page.getByTestId("box").first()).toHaveScreenshot(
      "dex-tile-hovered.png",
    );
  });

  test("info button hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    // In view first, so the screenshot doesn't scroll another tile under the
    // mouse.
    await page.getByTestId("box").first().scrollIntoViewIfNeeded();
    await settle(page);
    await hover(uncaught(page).getByTestId("set-info"));
    await expect(page.getByTestId("box").first()).toHaveScreenshot(
      "dex-info-button-hovered.png",
    );
  });

  // A tile shows it's pending while marking it waits on the server. The spec
  // holds the request, and then answers it itself, so the capture is never
  // saved for the specs after it. (Left hanging, WebKit sends it once the
  // page closes.)
  test("tile pending", async ({ page }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    await page.route("**/api/captures", async (route) => {
      await answered;
      await route.fulfill({ json: [] });
    });
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    await settle(page);
    const marking = page.waitForRequest("**/api/captures");
    await uncaught(page).click();
    await marking;
    try {
      // Not settle, which would wait on the request.
      await page.mouse.move(-1, -1);
      await expect(page.getByTestId("box").first()).toHaveScreenshot(
        "dex-tile-pending.png",
      );
    } finally {
      // Even if the screenshot fails, so the capture isn't saved.
      const response = page.waitForResponse("**/api/captures");
      answer();
      await response;
    }
  });

  test("scroll button", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    await page.getByTestId("box").nth(3).scrollIntoViewIfNeeded();
    await settle(page);
    await expect(page).toHaveScreenshot("dex-scroll-button.png");
  });

  // In night mode too, it takes the day's darker blue on hover.
  test("scroll button hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    await page.getByTestId("box").nth(3).scrollIntoViewIfNeeded();
    await settle(page);
    // The button's arrow, which hovers the button.
    await hover(page.locator(".fa-long-arrow-alt-up"));
    await expect(page).toHaveScreenshot("dex-scroll-button-hovered.png");
  });

  test("info tab hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    await settle(page);
    await hover(page.getByTestId("info-toggle"));
    await expect(page).toHaveScreenshot("dex-info-tab-hovered.png");
  });

  test("info link hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    // The panel starts collapsed on a phone.
    if (
      (await page.getByTestId("info").getAttribute("data-collapsed")) === "true"
    ) {
      await page.getByTestId("info-toggle").click();
    }
    await settle(page);
    await hover(page.getByRole("link", { name: "Bulbapedia" }));
    await expect(page).toHaveScreenshot("dex-info-link-hovered.png");
  });

  test("search", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await page.getByPlaceholder(/Search/).fill("bay");
    await settle(page);
    await expect(page).toHaveScreenshot("dex-search.png");
  });

  test("hide caught", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await page.getByText("Hide Caught Pokémon").click();
    await settle(page);
    await expect(page).toHaveScreenshot("dex-hide-caught.png");
  });

  test("share panel", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 800,
      "The share link is hidden on a phone",
    );
    await signIn(page, ash);
    await page.goto(livingDex);
    await page.getByTestId("share-toggle").first().click();
    await settle(page);
    await expect(page).toHaveScreenshot("dex-share.png");
  });

  test("someone else's dex", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(waterDex);
    await expect(page.getByTestId("progress-count")).toContainText("3 caught");
    await settle(page);
    await expect(page).toHaveScreenshot("dex-other.png");
  });

  test("new version banner", async ({ page }) => {
    // The app checks /version every 30 seconds, and whenever the page becomes
    // visible again, and shows the banner when the answer changes. The test
    // uses the second: waiting on the timer is at the mercy of a busy machine.
    let version = "first";
    await page.route("**/version", (route) => route.fulfill({ body: version }));
    await signIn(page, ash);
    const firstCheck = page.waitForResponse("**/version");
    await page.goto(livingDex);
    await firstCheck;
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    version = "second";
    await page.evaluate(() =>
      window.dispatchEvent(new Event("visibilitychange")),
    );
    await expect(page.getByTestId("reload-banner")).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("dex-new-version.png");
  });
});

test.describe("account and navigation", () => {
  test("account", async ({ page }) => {
    await signIn(page, ash);
    await page.goto("/account");
    await settle(page);
    await expect(page).toHaveScreenshot("account.png", { fullPage: true });
  });

  test("account saved", async ({ page }) => {
    await signIn(page, brock);
    await page.goto("/account");
    await page.locator("#friend_code_switch").fill("SW-1111-2222-3333");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("alert-success")).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("account-saved.png", {
      fullPage: true,
    });
  });

  test("nav dropdown", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await settle(page);
    // After settle, which moves the mouse away.
    await hover(page.getByTestId("nav-dropdown"));
    await expect(page.getByTestId("nav-dropdown-menu")).toBeVisible();
    await expect(page).toHaveScreenshot("nav-dropdown.png");
  });

  test("nav dropdown item hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await settle(page);
    await hover(page.getByTestId("nav-dropdown"));
    const menu = page.getByTestId("nav-dropdown-menu");
    await expect(menu).toBeVisible();
    await hover(menu.getByRole("link", { name: "Profile" }));
    await expect(page).toHaveScreenshot("nav-dropdown-item.png");
  });
});

// Tooltips show on hover, after settle, which moves the mouse away. Each one
// sits in a different place with its own styles.
test.describe("tooltips", () => {
  test("night mode toggle", async ({ page }) => {
    await page.goto("/login");
    await settle(page);
    await hover(page.getByTestId("night-mode-toggle"));
    await expect(page).toHaveScreenshot("tooltip-night-mode.png");
  });

  test("register heading", async ({ page }) => {
    await page.goto("/register");
    await settle(page);
    await hover(
      page.getByRole("heading", { name: "First Dex Info" }).locator("svg"),
    );
    await expect(page).toHaveScreenshot("tooltip-register-heading.png");
  });

  test("register dex type", async ({ page }) => {
    await page.goto("/register");
    // The first game has no dex types with a description.
    await page.locator("select").selectOption("scarlet_expansion_pass");
    await settle(page);
    await hover(page.getByTestId("dex-type-info").first().locator("svg"));
    await expect(page).toHaveScreenshot("tooltip-register-dex-type.png");
  });

  test("edit dex warning", async ({ page }) => {
    await signIn(page, gary);
    await page.goto(`/u/${gary}`);
    await page.getByTestId("dex-edit-toggle").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#dex_title").fill("Renamed Dex");
    await settle(page);
    await scrollToTop(page);
    await hover(dialog.getByTestId("form-warning").first().locator("svg"));
    await expect(page).toHaveScreenshot("tooltip-dex-warning.png");
  });

  test("evolution notes", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(livingDex);
    await page.getByPlaceholder(/Search/).fill("eevee");
    await page.getByTestId("set-info").first().click();
    const notes = page.getByTestId("evolution-notes").first();
    await expect(notes).toBeVisible();
    await settle(page);
    await hover(notes.locator("svg"));
    await expect(page).toHaveScreenshot("tooltip-evolution-notes.png");
  });
});

// Each button color darkens on hover.
test.describe("buttons", () => {
  test("blue hovered", async ({ page }) => {
    await page.goto("/login");
    await settle(page);
    await hover(page.getByRole("button", { name: "Let's go!" }));
    await expect(page).toHaveScreenshot("button-blue-hovered.png");
  });

  test("white hovered", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    // The nav's Login link comes first.
    await hover(page.getByRole("link", { name: "Login" }).last());
    await expect(page).toHaveScreenshot("button-white-hovered.png");
  });

  // Ash, whose account no spec saves, unlike brock's.
  test("yellow hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto("/account");
    await settle(page);
    await hover(page.getByRole("button", { name: "Change" }));
    await expect(page).toHaveScreenshot("button-yellow-hovered.png");
  });
});

test.describe("links", () => {
  test("friend code pencil hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await settle(page);
    await hover(page.locator('header a[href="/account"]').first());
    await expect(page).toHaveScreenshot("link-friend-code-hovered.png");
  });

  test("dex edit pencil hovered", async ({ page }) => {
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await settle(page);
    await hover(page.getByTestId("dex-edit-toggle").first());
    await expect(page).toHaveScreenshot("link-dex-edit-hovered.png");
  });

  test("hovered", async ({ page }) => {
    await page.goto("/login");
    await settle(page);
    await hover(page.getByRole("link", { name: "Register here" }));
    await expect(page).toHaveScreenshot("link-hovered.png");
  });
});
