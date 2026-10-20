import { slugOf } from "../slug";
import {
  expect,
  nightMode,
  scrollToTop,
  settle,
  signIn,
  test,
} from "./fixtures";
import { USERS } from "./setup";

const ash = USERS.ash.username;
const misty = USERS.misty.username;
const brock = USERS.brock.username;
const gary = USERS.gary.username;
const livingDex = `/u/${ash}/${slugOf("Living Dex")}`;
const waterDex = `/u/${misty}/${slugOf("Water Dex")}`;

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
    // The app checks /version every 30 seconds and shows the banner when it
    // changes. The clock is fast-forwarded past the next check.
    let version = "first";
    await page.route("**/version", (route) => route.fulfill({ body: version }));
    await page.clock.install();
    await signIn(page, ash);
    const firstCheck = page.waitForResponse("**/version");
    await page.goto(livingDex);
    await firstCheck;
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    version = "second";
    await page.clock.fastForward(31_000);
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
    await page.getByTestId("nav-dropdown").hover();
    await expect(page.getByTestId("nav-dropdown-menu")).toBeVisible();
    await expect(page).toHaveScreenshot("nav-dropdown.png");
  });
});

test.describe("night mode", () => {
  test("home", async ({ page }) => {
    await nightMode(page);
    await page.goto("/");
    await settle(page);
    await expect(page).toHaveScreenshot("night-home.png", { fullPage: true });
  });

  test("profile", async ({ page }) => {
    await nightMode(page);
    await signIn(page, ash);
    await page.goto(`/u/${ash}`);
    await expect(
      page.getByTestId("dex-preview").filter({
        hasText: "Shiny Hunt",
      }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot("night-profile.png", {
      fullPage: true,
    });
  });

  test("dex", async ({ page }) => {
    await nightMode(page);
    await signIn(page, ash);
    await page.goto(livingDex);
    await expect(page.getByTestId("progress-count")).toContainText("7 caught");
    await settle(page);
    await expect(page).toHaveScreenshot("night-dex.png");
  });
});
