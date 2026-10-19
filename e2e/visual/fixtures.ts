import { createHash, randomUUID } from "node:crypto";
import { access, link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test as base, expect, type Page, type Route } from "@playwright/test";

import { cancelledByNavigation } from "../fixtures";
import { PASSWORD } from "./setup";

// Like the e2e fixtures, but Google Fonts is allowed: how text renders is
// exactly what a styling change can break. Everything else from other sites
// is still blocked.
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

// Google can answer the same font request with slightly different files, which
// renders text a few pixels differently. So every font response is kept in
// tmp/visual/fonts the first time it's fetched, and both sides of a
// comparison are served exactly the same bytes.
const FONT_CACHE = join("tmp", "visual", "fonts");

async function serveFont(route: Route, browser: string): Promise<void> {
  // Google answers each browser differently, so each gets its own copy.
  const key = createHash("sha256")
    .update(`${browser} ${route.request().url()}`)
    .digest("hex");
  const bodyPath = join(FONT_CACHE, key);
  const headersPath = `${bodyPath}.json`;
  if (!(await cached(bodyPath, headersPath))) {
    const response = await route.fetch();
    // A failure isn't kept, so it can't be replayed as if it were the font.
    if (!response.ok()) {
      await route.fulfill({ response });
      return;
    }
    const headers = {
      "content-type": response.headers()["content-type"] ?? "",
      "access-control-allow-origin": "*",
    };
    // Parallel tests can fetch the same font at once. Each writes its own
    // copy, and the first to be linked into place wins; everyone then serves
    // that one, so every test sees the same bytes.
    await mkdir(FONT_CACHE, { recursive: true });
    const temporary = `${bodyPath}.${process.pid}.${randomUUID()}`;
    await writeFile(`${temporary}.json`, JSON.stringify(headers));
    await writeFile(temporary, await response.body());
    await link(`${temporary}.json`, headersPath).catch(() => {});
    await link(temporary, bodyPath).catch(() => {});
    await Promise.all([rm(temporary), rm(`${temporary}.json`)]);
  }
  const [body, headers] = await Promise.all([
    readFile(bodyPath),
    readFile(headersPath, "utf8"),
  ]);
  await route.fulfill({ body, headers: JSON.parse(headers) });
}

async function cached(...paths: string[]): Promise<boolean> {
  try {
    await Promise.all(paths.map((path) => access(path)));
    return true;
  } catch {
    return false;
  }
}

export const test = base.extend({
  page: async ({ baseURL, browserName, page }, use) => {
    const { host, origin } = new URL(baseURL!);
    await page.route(
      (url) => url.origin !== origin,
      (route) =>
        FONT_HOSTS.includes(new URL(route.request().url()).hostname)
          ? serveFont(route, browserName)
          : route.abort(),
    );
    // Two things Chromium draws a little differently from one load to the
    // next are switched off on both sides. Transitions: the screenshots only
    // ever show where they end, but text and icons come out a shade different
    // depending on whether something was mid-transition when Chromium laid out
    // its layers. And the gaps underlines leave around letters like "y": a gap
    // can start a pixel earlier or later. The underlines themselves are still
    // drawn.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent =
          "*, *::before, *::after { transition: none !important; text-decoration-skip-ink: none !important; }";
        document.head.append(style);
      });
    });
    const errors: Error[] = [];
    page.on("pageerror", (error) => {
      if (!cancelledByNavigation(error, host)) {
        errors.push(error);
      }
    });
    await use(page);
    expect(errors, "uncaught errors on the page").toEqual([]);
  },
});

export { expect };

// signIn starts a session as one of the fixed users before the page loads.
export async function signIn(page: Page, username: string): Promise<void> {
  const response = await page.request.post("/api/sessions", {
    data: { username, password: PASSWORD },
  });
  expect(response.status(), await response.text()).toBe(200);
  const { token } = await response.json();
  await page.addInitScript((value) => {
    window.localStorage.setItem("token", value);
  }, token);
}

// nightMode turns night mode on before the page loads.
export async function nightMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("nightMode", "true");
  });
}

// settle waits until the page has nothing left to load: data, fonts, and
// images (sprites included). An image that fails counts as done, and the wait
// for images gives up after a few seconds instead of hanging the test.
//
// It first moves the mouse off the page, so nothing is hovered. After a click
// moves things around, WebKit sometimes keeps the old element hovered and
// sometimes doesn't, and Firefox doesn't always draw a hover in time for the
// screenshot.
export async function settle(page: Page): Promise<void> {
  await page.mouse.move(-1, -1);
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images)
      .filter((image) => !image.complete)
      .map(
        (image) =>
          new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          }),
      );
    await Promise.race([
      Promise.all(images),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  });
}

// scrollToTop puts the page behind a modal back at the top. Opening a modal
// focuses its first field, which some browsers scroll the page for,
// depending on timing.
export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
}
