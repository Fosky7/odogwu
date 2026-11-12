import { test, expect } from "@playwright/test";

test("@affected home page Browse bills doorway opens the feed", async ({ page }) => {
  await page.goto("/");

  const browseBills = page.getByTestId("home-browse-bills-link");
  await expect(browseBills).toBeVisible();
  await expect(browseBills).toContainText(/browse bills/i);

  await browseBills.click();

  await expect(page).toHaveURL(/\/feed$/);
});

test("@affected home page Dashboard doorway opens the dashboard", async ({ page }) => {
  await page.goto("/");

  const dashboard = page.getByTestId("home-dashboard-link");
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toContainText(/dashboard/i);

  await dashboard.click();

  await expect(page).toHaveURL(/\/dashboard$/);
});
