import { expect, test } from './fixtures';

import type { Response } from '@playwright/test';

test('the home page loads with the config the server added', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Pokédex Tracker', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register', exact: true })).toBeVisible();

  const config = await page.evaluate(() => window.POKEDEXTRACKER_CONFIG);
  expect(config).toMatchObject({ environment: 'development' });
});

// The Go tests cover the caching rules with a stand-in build. This checks the
// real one: if webpack's file names stopped matching the server's pattern for
// hashed assets, scripts would quietly lose their long-term caching.
test('the scripts are gzipped and cached forever', async ({ page }) => {
  const scripts: Response[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') {
      scripts.push(response);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pokédex Tracker', level: 1 })).toBeVisible();

  expect(scripts.length, 'scripts loaded').toBeGreaterThan(0);
  for (const script of scripts) {
    const headers = await script.allHeaders();
    expect(headers['cache-control'], script.url()).toBe('public, max-age=31536000, immutable');
    expect(headers['content-encoding'], script.url()).toBe('gzip');
  }
});
