import { createUser, expect, PASSWORD, test, uniqueUsername } from './fixtures';

test('registering creates the first dex and signs in', async ({ page }) => {
  const username = uniqueUsername();
  await page.goto('/register');

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#password_confirm').fill(PASSWORD);
  await page.locator('#dex_title').fill('Lumiose Dex');
  await page.getByRole('combobox').selectOption({ label: 'Legends: Z-A' });
  await page.getByRole('button', { name: 'Let\'s go!' }).click();

  await expect(page).toHaveURL(`/u/${username}/lumiose-dex`);
  await expect(page.locator('.percentage h3')).toHaveText('(0 caught, 237 to go)');
  await expect(page.locator('nav .dropdown')).toContainText(username);
});

test('signing in and out', async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto('/login');

  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Let\'s go!' }).click();

  await expect(page).toHaveURL(`/u/${user.username}`);
  await page.locator('nav .dropdown').hover();
  await page.getByText('Sign Out').click();

  await expect(page.locator('nav').getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('token'))).toBeNull();
});

test('a wrong password is turned away', async ({ page, request }) => {
  const user = await createUser(request);
  await page.goto('/login');

  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill('not-the-password');
  await page.getByRole('button', { name: 'Let\'s go!' }).click();

  await expect(page.locator('.alert-error')).toHaveText('password is invalid');
  await expect(page).toHaveURL('/login');
});
