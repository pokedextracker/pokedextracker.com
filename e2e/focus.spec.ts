import { expect, test } from "./fixtures";

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

// A mouse click leaves neither the ring nor the hover color behind.
test("a mouse click on a link shows no ring", async ({ page }) => {
  await page.goto("/login");
  const link = page.getByRole("link", { name: "Register here" });
  // So the click stays on the page, to see what it leaves.
  await link.evaluate((a) =>
    a.addEventListener("click", (event) => event.preventDefault()),
  );

  await link.click();
  await page.mouse.move(0, 0);
  await expect(link).toHaveCSS("outline-style", "none");
  await expect(link).toHaveCSS("color", linkColor);
});
