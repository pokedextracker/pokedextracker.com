import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const toggle = (page: Page) => page.getByTestId("night-mode-toggle");

// Without a choice of their own, a visitor starts in their device's mode.
test("night mode starts on when the device is dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");

  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toContainText("Night Mode Off");
});

test("night mode starts off when the device is light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");

  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toContainText("Night Mode On");
});

// Once they've used the toggle, their choice wins over the device's, and it
// sticks across loads.
test("the toggle's choice wins over the device's", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await toggle(page).click();

  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(toggle(page)).toContainText("Night Mode On");

  await toggle(page).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

const themeColor = (page: Page) => page.locator('meta[name="theme-color"]');

// The browser's own parts, like scrollbars, form controls and the bar around
// the page on phones, follow night mode too.
test("the browser's parts follow night mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");

  await expect(page.locator("html")).toHaveCSS("color-scheme", "normal");
  await expect(themeColor(page)).toHaveAttribute("content", "#ffffff");

  await toggle(page).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(themeColor(page)).toHaveAttribute("content", "#262626");

  await toggle(page).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "normal");
  await expect(themeColor(page)).toHaveAttribute("content", "#ffffff");
});

// Printing drops backgrounds, which would leave night mode's light text on
// white paper, so it prints in day colors.
test("night mode prints in day colors", async ({ page }) => {
  const field = page.locator("#username");
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  const dayBorder = await field.evaluate(
    (element) => getComputedStyle(element).borderTopColor,
  );

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  const heading = page.getByRole("heading", { name: "Login" });
  await expect(page.locator("html")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(field).not.toHaveCSS("border-top-color", dayBorder);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator("html")).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.locator("html")).toHaveCSS("color-scheme", "normal");
  await expect(heading).toHaveCSS("color", "rgb(24, 68, 125)");
  // The field's border is a night class rather than a role.
  await expect(field).toHaveCSS("border-top-color", dayBorder);
});

// index.html sets the mode before the app loads, so the page doesn't flash the
// wrong one first. With the app's scripts blocked, only it runs.
test("the mode is set before the app loads", async ({ page }) => {
  await page.route(/\.(js|ts|tsx)(\?.*)?$/, (route) => route.abort());

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(themeColor(page)).toHaveAttribute("content", "#262626");

  // A saved choice wins over the device's, either way.
  await page.addInitScript(() => localStorage.setItem("nightMode", "true"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.addInitScript(() => localStorage.setItem("nightMode", "false"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(themeColor(page)).toHaveAttribute("content", "#ffffff");
});
