import { createUser, expect, test } from "./fixtures";

// The focus role's color by day, which a link's color shares.
const focusColor = "rgb(30, 84, 155)";
const linkColor = "rgb(30, 84, 155)";

// A ring shows what has keyboard focus. A text field shows it however it's
// focused, since it's where typing goes.
test("keyboard focus shows a ring", async ({ browserName, page }) => {
  await page.goto("/login");
  const field = page.locator("#username");
  await field.click();
  await expect(field).toHaveCSS("outline-style", "solid");

  // Like Safari, WebKit's Tab only stops on form fields, and Option+Tab on
  // buttons and links too.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.keyboard.press(tab);
  await page.keyboard.press(tab);
  const button = page.getByRole("button", { name: "Let's go!" });
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(button).toHaveCSS("outline-color", focusColor);
});

// A mouse click leaves neither the ring nor the hover color behind. (WebKit,
// like Safari, doesn't focus a link or button on a click at all.)
test("a mouse click shows no ring", async ({ page }) => {
  await page.goto("/login");
  const link = page.getByRole("link", { name: "Register here" });
  const button = page.getByRole("button", { name: "Let's go!" });
  // So the clicks stay on the page, to see what they leave.
  for (const element of [link, button]) {
    await element.evaluate((e) =>
      e.addEventListener("click", (event) => event.preventDefault()),
    );
  }

  await link.click();
  await page.mouse.move(0, 0);
  await expect(link).toHaveCSS("outline-style", "none");
  await expect(link).toHaveCSS("color", linkColor);

  const background = await button.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await button.click();
  await page.mouse.move(0, 0);
  await expect(button).toHaveCSS("outline-style", "none");
  await expect(button).toHaveCSS("background-color", background);
});

// Focus with nothing clicked yet shows a ring, which the nav's links draw
// inside themselves, since they fill its height.
test("the nav's focus ring is inside its links", async ({ page }) => {
  await page.goto("/login");
  const logo = page
    .locator("nav")
    .getByRole("link", { name: "Pokédex Tracker" });
  await logo.focus();
  await expect(logo).toHaveCSS("outline-style", "solid");
  await expect(logo).toHaveCSS("outline-offset", "-4px");
});

// The info panel is the focus color's blue, so its ring is white.
test("the info panel's focus ring is white", async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto(`/u/${user.username}/${user.slug}`);
  const link = page.getByRole("link", { name: /Bulbapedia/ });
  await link.focus();
  await expect(link).toHaveCSS("outline-style", "solid");
  await expect(link).toHaveCSS("outline-color", "rgb(255, 255, 255)");
});
