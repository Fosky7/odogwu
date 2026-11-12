import { test, expect } from "@playwright/test";

test.describe("dashboard receipt flow", () => {
  test("clicking View receipt opens the Payment receipt page @affected", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /my pledges/i })
    ).toBeVisible();

    const viewReceipt = page.getByRole("link", { name: /view receipt/i }).first();
    await expect(viewReceipt).toBeVisible();

    await viewReceipt.click();

    await expect(page).toHaveURL(/\/receipt\//);
    await expect(
      page.getByRole("heading", { name: /payment receipt/i, level: 1 })
    ).toBeVisible();
  });
});
