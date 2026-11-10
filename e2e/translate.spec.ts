import type { Page } from "@playwright/test";

import {
  test as base,
  createUser,
  expect,
  SERVER_ERROR,
  signIn,
  tile,
} from "./fixtures";

// translatePage makes the page act like it's run through Google Translate,
// which swaps each text node it translates for <font><font>text</font></font>
// and keeps doing so as the page changes. React still holds the text nodes it
// made, so adding a node next to one that's been swapped throws, and changing
// one changes a node that's no longer on the page. Real Translate swaps nodes
// later and in batches, so this is stricter than it is.
//
// The text stays the same here, so the tests can still find it. That also
// means stale text only shows up where a test checks for the new text.
//
// React's error boundary catches what it throws, so it isn't an uncaught
// error. The DOM methods that throw record it on the window instead.
async function translatePage(page: Page) {
  await page.addInitScript(() => {
    const errors: string[] = [];
    Object.assign(window, { domErrors: errors });
    for (const method of ["insertBefore", "removeChild"] as const) {
      const original = Node.prototype[method] as (...args: Node[]) => Node;
      Object.assign(Node.prototype, {
        [method](this: Node, ...args: Node[]) {
          try {
            return original.apply(this, args);
          } catch (error) {
            if (error instanceof DOMException) {
              errors.push(`${method}: ${error.name}: ${error.message}`);
            }
            throw error;
          }
        },
      });
    }

    const skipped = new Set(["FONT", "SCRIPT", "STYLE", "NOSCRIPT", "TITLE"]);

    const translate = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentNode;
        const text = node.textContent ?? "";
        if (
          !parent ||
          !text.trim() ||
          (parent instanceof Element && skipped.has(parent.tagName))
        ) {
          return;
        }
        const outer = document.createElement("font");
        const inner = document.createElement("font");
        inner.textContent = text;
        outer.append(inner);
        parent.replaceChild(outer, node);
        return;
      }
      if (node instanceof Element && skipped.has(node.tagName)) {
        return;
      }
      Array.from(node.childNodes).forEach(translate);
    };

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          if (mutation.target.isConnected) {
            translate(mutation.target);
          }
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.isConnected) {
            translate(node);
          }
        });
      }
    }).observe(document, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  });
}

// Every test here runs in a page that acts translated, and fails if React
// threw on the DOM.
const test = base.extend({
  page: async ({ page }, use) => {
    await translatePage(page);
    await use(page);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as unknown as { domErrors: string[] }).domErrors,
          ),
        { message: "DOM errors on the page", timeout: 1000 },
      )
      .toEqual([]);
  },
});

test("editing a dex asks to confirm and saves the new title", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}`);

  await page.getByTestId("dex-edit-toggle").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#dex_title").fill("Shiny Hunt");
  await expect(dialog).toContainText(`/u/${user.username}/shiny-hunt`);
  await dialog.getByRole("button", { name: "Edit" }).click();
  await dialog.getByRole("button", { name: "Confirm Edit" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTestId("nav-dropdown-menu")).toContainText(
    "Shiny Hunt",
  );
});

test("creating a dex shows the URL for its title", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}`);

  await page.getByText("Create a New Dex").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`/u/${user.username}/living-dex`);
  await dialog.locator("#dex_title").fill("Shiny Hunt");
  await expect(dialog).toContainText(`/u/${user.username}/shiny-hunt`);
});

test("night mode's label follows the toggle", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  const toggle = page.getByTestId("night-mode-toggle");
  await expect(toggle).toContainText("Night Mode On");

  await toggle.click();
  await expect(toggle).toContainText("Night Mode Off");
});

test("marking a box updates its button and the progress", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  const button = page.getByTestId("box").first().getByRole("button");
  const progress = page.getByText(/% done!/);
  await expect(button).toHaveText("Mark All");
  await expect(progress).toContainText("0.0% done!");

  await button.click();
  await expect(button).toHaveText("Unmark All");
  await expect(progress).not.toContainText("0.0% done!");

  await button.click();
  await expect(button).toHaveText("Mark All");
  await expect(progress).toContainText("0.0% done!");
});

test("the info panel shows each Pokémon chosen", async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto(`/u/${user.username}/${user.slug}`);

  await tile(page, "Bayleef").hover();
  await tile(page, "Bayleef").getByTestId("set-info").click();
  await expect(page.getByTestId("info-name")).toHaveText("Bayleef");

  await tile(page, "Chikorita").hover();
  await tile(page, "Chikorita").getByTestId("set-info").click();
  await expect(page.getByTestId("info-name")).toHaveText("Chikorita");
  await expect(page.getByTestId("info-main")).toContainText("#001");
});

test("the save error banner shows the latest error", async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  await expect(page.getByTestId("progress-count")).toHaveText(
    "(0 caught, 237 to go)",
  );
  const banner = page.getByTestId("save-error-banner");

  await page.route("**/api/captures", (route) =>
    route.request().method() === "GET"
      ? route.fallback()
      : route.fulfill(SERVER_ERROR),
  );
  await tile(page, "Chikorita").getByTestId("set-captured").click();
  await expect(banner).toContainText("Something went wrong on our end");

  await page.unroute("**/api/captures");
  await page.route("**/api/captures", (route) =>
    route.request().method() === "GET"
      ? route.fallback()
      : route.abort("internetdisconnected"),
  );
  await tile(page, "Chikorita").getByTestId("set-captured").click();
  await expect(banner).toContainText("Check your connection");
});

// The profile page stays mounted going from someone else's profile to your
// own, so the header's title changes in place.
test("the header shows the profile being viewed", async ({ page, request }) => {
  const other = await createUser(request);
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${other.username}`);
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText(`${other.username}'s Profile`);

  await page.getByTestId("nav-dropdown").hover();
  await page
    .getByTestId("nav-dropdown-menu")
    .getByRole("link", { name: "Profile" })
    .click();
  await expect(page).toHaveURL(`/u/${user.username}`);
  await expect(title).toHaveText(`${user.username}'s Profile`);
});
