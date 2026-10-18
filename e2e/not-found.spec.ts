import { expect, test } from './fixtures';

test('an unknown page shows the not found page', async ({ page }) => {
  await page.goto('/this/page/does/not/exist');

  await expect(page.getByRole('heading', { name: /404 Error/ })).toBeVisible();
});

test('a user who doesn\'t exist shows the not found page', async ({ page }) => {
  await page.goto('/u/e2e_nobody');

  await expect(page.getByRole('heading', { name: /404 Error/ })).toBeVisible();
});
