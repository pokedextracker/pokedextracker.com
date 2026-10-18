import { createUser, expect, signIn, test } from './fixtures';

import type { Page } from '@playwright/test';

function tile (page: Page, name: string) {
  return page.locator('.pokemon').filter({ hasText: name });
}

// toggleCaught clicks a tile and waits for the API to save the change, so a
// reload right after sees it.
async function toggleCaught (page: Page, name: string) {
  const saved = page.waitForResponse((response) => response.url().endsWith('/api/captures') && response.ok());
  await tile(page, name).locator('.set-captured').click();
  await saved;
}

test('marking a Pokémon as caught is saved', async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto(`/u/${user.username}/${user.slug}`);
  const progress = page.locator('.percentage h3');
  await expect(progress).toHaveText('(0 caught, 237 to go)');

  await toggleCaught(page, 'Chikorita');
  await expect(tile(page, 'Chikorita')).toHaveClass(/\bcaptured\b/);
  await expect(progress).toHaveText('(1 caught, 236 to go)');

  await page.reload();
  await expect(tile(page, 'Chikorita')).toHaveClass(/\bcaptured\b/);
  await expect(progress).toHaveText('(1 caught, 236 to go)');

  await toggleCaught(page, 'Chikorita');
  await expect(tile(page, 'Chikorita')).not.toHaveClass(/\bcaptured\b/);

  await page.reload();
  await expect(progress).toHaveText('(0 caught, 237 to go)');
  await expect(tile(page, 'Chikorita')).not.toHaveClass(/\bcaptured\b/);
});

test('the info panel shows the chosen Pokémon', async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto(`/u/${user.username}/${user.slug}`);

  await tile(page, 'Bayleef').hover();
  await tile(page, 'Bayleef').locator('.set-info').click();

  await expect(page.locator('.info-header h1')).toHaveText('Bayleef');
  await expect(page.locator('.info-main')).toContainText('Chikorita');
  await expect(page.locator('.info-main')).toContainText('Level Up to 16');
});

test('someone else\'s dex is read-only', async ({ page, request }) => {
  const owner = await createUser(request);
  const visitor = await createUser(request);
  await signIn(page, visitor);
  await page.goto(`/u/${owner.username}/${owner.slug}`);
  const writes: string[] = [];
  page.on('request', (sent) => {
    if (sent.url().endsWith('/api/captures')) {
      writes.push(sent.method());
    }
  });

  await expect(tile(page, 'Chikorita')).toHaveClass(/\bviewing\b/);
  await tile(page, 'Chikorita').locator('.set-captured').click();
  await page.reload();

  await expect(tile(page, 'Chikorita')).not.toHaveClass(/\bcaptured\b/);
  await expect(page.locator('.percentage h3')).toHaveText('(0 caught, 237 to go)');
  expect(writes, 'requests to change captures').toEqual([]);
});
