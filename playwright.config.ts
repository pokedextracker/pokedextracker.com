import { defineConfig, devices } from "@playwright/test";

// The dev launcher (mise test:e2e) builds the site, serves it from the Go
// binary against a freshly seeded database, and passes its address here.
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
  throw new Error(
    "E2E_BASE_URL is not set. Run the tests with mise test:e2e, which starts the server.",
  );
}

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  // The visual comparison has its own config (playwright.visual.config.ts).
  testIgnore: "visual/**",
  use: { baseURL, trace: "retain-on-failure" },
});
