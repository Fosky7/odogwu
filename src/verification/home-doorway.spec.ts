import { test, expect } from "@playwright/test";

test.describe("home doorway to pledge and checkout", () => {
  test("home page opens the feed, pledge sheet and Paystack checkout @affected", async ({ page }) => {
    await page.goto("/");

    const openFeed = page.getByRole("link", { name: "Open the feed", exact: true }).first();
    await expect(openFeed).toBeVisible();
    await openFeed.click();

    await expect(page).toHaveURL(/\/feed/);

    const pledgeButton = page.getByRole("button", { name: "Pledge", exact: true }).first();
    await expect(pledgeButton).toBeVisible();
    await pledgeButton.click();

    await expect(page.getByText("Make a pledge", { exact: true }).first()).toBeVisible();

    const amountField = page.getByLabel(/Amount/i).first();
    await expect(amountField).toBeVisible();
    await expect(amountField).not.toHaveValue("");
    await expect(amountField).toHaveValue(/\d/);

    await page.getByRole("button", { name: "Continue to payment", exact: true }).first().click();

    await expect(page.getByRole("button", { name: "Pay with Paystack", exact: true }).first()).toBeVisible();
  });

  test("header Feed link opens the deck and /checkout shows Amount due @affected", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Feed", exact: true }).first().click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole("button", { name: "Pledge", exact: true }).first()).toBeVisible();

    await page.goto("/checkout");
    await expect(page.getByText("Amount due", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay with Paystack", exact: true }).first()).toBeVisible();
  });
});
