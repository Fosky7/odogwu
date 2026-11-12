import { test, expect } from "@playwright/test";

test("home header Causes link opens the verified cause detail @affected", async ({ page }) => {
  await page.goto("/");

  const causesLink = page.getByRole("link", { name: "Causes", exact: true }).first();
  await expect(causesLink).toBeVisible();
  await causesLink.click();

  await expect(page).toHaveURL(/\/cause\//);
  await expect(page.getByText("Bill proof", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why this bill" })).toBeVisible();
});
