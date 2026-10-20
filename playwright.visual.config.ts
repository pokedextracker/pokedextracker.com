import { defineConfig, devices } from "@playwright/test";

import type { VisualOptions } from "./e2e/visual/fixtures";

// The visual comparison (mise test:visual). The dev launcher serves the
// reference build and then this branch's, runs this config in Playwright's
// Linux image, and passes the address and which side it is. The reference
// side writes the screenshots, and this branch's side compares against them.
// Nothing here is committed: it's all in tmp/visual.
const baseURL = process.env.E2E_BASE_URL;
const side = process.env.VISUAL_SIDE;
if (!baseURL || !side) {
  throw new Error(
    "E2E_BASE_URL and VISUAL_SIDE aren't set. Run the comparison with mise test:visual.",
  );
}

const desktop = { width: 1280, height: 800 };
const phone = { width: 390, height: 844 };

export default defineConfig<VisualOptions>({
  expect: {
    // Generous, since a busy machine shouldn't need a retry.
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      // Keep every pixel of the high-resolution phones rather than scaling
      // them down to the page's size.
      scale: "device",
      // The launcher takes the screenshots in Playwright's Linux image, which
      // renders the same page almost identically every time. Repeated
      // captures of an unchanged site differ by at most 4 pixels, a shade
      // lighter or darker: Chromium smooths the profile's small pencil icons
      // a little differently from one load to the next. A real change of
      // layout, color, or font touches more than this.
      maxDiffPixels: 5,
      // Any change of color counts, even one step (Playwright's default
      // ignores shifts that small).
      threshold: 0,
    },
  },
  // On this branch's side, a test that passed only on a retry fails the run.
  // The launcher passes it anyway if every failed attempt was a hiccup, like
  // a timeout or a dropped connection, and otherwise lists it separately: a
  // screenshot that differed and then matched is either noise or a change
  // that only happens some of the time, so it's neither a pass nor a
  // difference.
  failOnFlakyTests: side === "branch",
  fullyParallel: true,
  retries: 2,
  timeout: 60_000,
  globalSetup: "./e2e/visual/setup.ts",
  outputDir: `tmp/visual/results-${side}`,
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: desktop },
    },
    {
      name: "chromium-phone",
      // A narrow window with a mouse. Chromium emulating a touch screen draws
      // small icons slightly differently from one load to the next.
      use: { ...devices["Desktop Chrome"], viewport: phone },
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"], viewport: desktop },
    },
    {
      name: "firefox-phone",
      use: { ...devices["Desktop Firefox"], viewport: phone },
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"], viewport: desktop },
    },
    {
      name: "webkit-phone",
      // A touch screen at twice the resolution, like an iPhone. The other
      // phones are narrow windows with a mouse, which covers hover styles at
      // that width: Firefox can't emulate a touch screen, and Chromium draws
      // small icons and underlines slightly differently from one load to the
      // next when it does.
      use: {
        ...devices["Desktop Safari"],
        viewport: phone,
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    // Every spec again in night mode, which is CSS overrides on the same
    // pages, so one browser covers it.
    {
      name: "chromium-desktop-night",
      use: { ...devices["Desktop Chrome"], viewport: desktop, night: true },
    },
    {
      name: "chromium-phone-night",
      use: { ...devices["Desktop Chrome"], viewport: phone, night: true },
    },
  ],
  reporter: [
    ["list"],
    // What the launcher reads to say which specs didn't pass and why.
    ["json", { outputFile: `tmp/visual/results-${side}.json` }],
    [
      "html",
      {
        open: "never",
        outputFolder:
          side === "branch" ? "tmp/visual/report" : `tmp/visual/report-${side}`,
      },
    ],
  ],
  snapshotPathTemplate:
    "tmp/visual/screenshots/{projectName}/{testFileName}/{arg}{ext}",
  testDir: "./e2e/visual",
  // The reference side writes the screenshots. This branch's side only
  // compares, so a screenshot the reference didn't take is a failure rather
  // than a new reference.
  updateSnapshots: side === "branch" ? "none" : "missing",
  use: { baseURL },
});
