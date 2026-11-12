import { test, expect } from '@playwright/test';

test.describe('@affected Module 9 dashboard data', () => {
  test('dashboard loads pledges and requests without an error message', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /my pledges/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /my requests/i })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(page.getByText(/pending verification/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /view receipt/i }).first()).toBeVisible();
    await expect(page.getByTestId('request-progress').first()).toBeVisible();
  });
});
