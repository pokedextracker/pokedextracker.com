import type { Response } from "@playwright/test";

import { expect, test } from "./fixtures";

test("the home page loads with the config the server added", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Pokédex Tracker", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Register", exact: true }),
  ).toBeVisible();

  const config = await page.evaluate(() => window.POKEDEXTRACKER_CONFIG);
  expect(config).toMatchObject({ environment: "development" });
});

// The Go tests cover the caching rules with a stand-in build. This checks the
// real one: if the build's scripts and styles moved out of the folder the
// server caches forever (Vite's assets/), they'd quietly lose that caching.
test("the scripts and styles are gzipped and cached forever", async ({
  baseURL,
  page,
}) => {
  const assets: Response[] = [];
  page.on("response", (response) => {
    const type = response.request().resourceType();
    if (
      (type === "script" || type === "stylesheet") &&
      response.url().startsWith(baseURL!)
    ) {
      assets.push(response);
    }
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Pokédex Tracker", level: 1 }),
  ).toBeVisible();

  const types = await Promise.all(
    assets.map((asset) => asset.request().resourceType()),
  );
  expect(types, "a script and a stylesheet loaded").toEqual(
    expect.arrayContaining(["script", "stylesheet"]),
  );
  for (const asset of assets) {
    const headers = await asset.allHeaders();
    expect(headers["cache-control"], asset.url()).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(headers["content-encoding"], asset.url()).toBe("gzip");
  }
});
