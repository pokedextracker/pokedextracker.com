import { createUser, expect, signIn, test } from './fixtures';

test('saving a friend code shows it on the profile', async ({ page, request }) => {
  const user = await createUser(request);
  await signIn(page, user);
  await page.goto('/account');

  await page.locator('#friend_code_switch').fill('SW-1234-5678-9012');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.alert-success')).toHaveText('Account settings saved!');

  await page.goto(`/u/${user.username}`);
  await expect(page.getByText('SW-1234-5678-9012')).toBeVisible();
});
