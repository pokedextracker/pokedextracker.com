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

// index.html sets the mode before the app loads, so the page doesn't flash the
// wrong one first. With the app's scripts blocked, only it runs.
test("the mode is set before the app loads", async ({ page }) => {
  await page.route(/\.(js|ts|tsx)(\?.*)?$/, (route) => route.abort());

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  // A saved choice wins over the device's, either way.
  await page.addInitScript(() => localStorage.setItem("nightMode", "true"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.addInitScript(() => localStorage.setItem("nightMode", "false"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});
