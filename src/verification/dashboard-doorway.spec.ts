import { test, expect } from "@playwright/test";

test("home page Dashboard doorway opens My pledges @affected", async ({ page }) => {
  await page.goto("/");

  const dashboardLink = page.getByRole("link", { name: /dashboard/i }).first();
  await expect(dashboardLink).toBeVisible();

  await dashboardLink.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /my pledges/i })).toBeVisible();
});
