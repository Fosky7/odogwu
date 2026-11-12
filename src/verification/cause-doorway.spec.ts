import { test, expect } from "@playwright/test";

test("home header Causes link opens the verified cause detail @affected", async ({ page }) => {
  await page.goto("/");

  const causesLink = page.getByRole("link", { name: "Causes", exact: true }).first();
  await expect(causesLink).toBeVisible();

  await causesLink.click();
  await expect(page).toHaveURL(/\/cause\/1/);

  // The Causes doorway must stay reachable on the cause detail page too.
  await expect(page.getByRole("link", { name: "Causes", exact: true }).first()).toBeVisible();
});
