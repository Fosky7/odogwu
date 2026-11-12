import { test, expect } from "@playwright/test";

test.describe("home header cause doorway @affected", () => {
  test("header Causes link opens the verified cause detail @affected", async ({ page }) => {
    await page.goto("/");

    const causesLink = page.getByRole("link", { name: "Causes", exact: true }).first();
    await expect(causesLink).toBeVisible();

    await causesLink.click();

    await expect(page).toHaveURL(/\/cause\/1\/?$/);
    await expect(page.getByText("Bill proof", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Why this bill", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Remaining", { exact: true }).first()).toBeVisible();
  });
});
