import { test, expect } from "@playwright/test";

/**
 * Module 8 · step 8 — the home doorway into the feed and the pledge journey.
 *
 * One test for the whole journey, driven entirely through the real UI:
 *   home → "Open the feed" → feed shows "Pledge" → "Make a pledge" with the
 *   "Amount" field → "Continue to payment" → "Pay with Paystack".
 *
 * The prefilled amount is read from the rendered sheet (never hard-coded), so
 * the test follows whatever the verified bill actually still owes.
 */

test.describe("home doorway to checkout @affected", () => {
  test("Open the feed leads to Pledge, Make a pledge and the Paystack checkout @affected", async ({
    page,
  }) => {
    await page.goto("/");

    // The home page rendered before anything is clicked.
    await expect(page.getByRole("heading", { name: "Clear a bill with a swipe", level: 1 })).toBeVisible({
      timeout: 20000,
    });

    // 1. "Open the feed" opens the feed, which shows a Pledge action.
    await page.getByRole("link", { name: "Open the feed" }).click();
    await expect(page).toHaveURL(/\/feed$/);

    const pledgeButton = page.getByRole("button", { name: "Pledge", exact: true });
    await expect(pledgeButton).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("feed-card")).toBeVisible();

    // 2. Pledge opens "Make a pledge" with the Amount field prefilled in Naira.
    await expect(page.getByTestId("pledge-sheet")).toHaveCount(0);
    await pledgeButton.click();

    const sheet = page.getByTestId("pledge-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });
    await expect(sheet.getByRole("heading", { name: "Make a pledge" })).toBeVisible();

    const amountField = sheet.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();

    const prefilled = await amountField.inputValue();
    expect(prefilled.length).toBeGreaterThan(0);
    expect(Number(prefilled)).toBeGreaterThan(0);

    const remainingText = await sheet.getByTestId("pledge-sheet-remaining").innerText();
    expect(remainingText).toContain("\u20A6");
    await expect(sheet.getByTestId("pledge-sheet-error")).toHaveCount(0);

    // 3. Continue to payment lands on the Paystack checkout.
    await sheet.getByRole("button", { name: "Continue to payment" }).click();

    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId("checkout-summary")).toContainText("Amount due");
    await expect(page.getByTestId("checkout-amount-due")).toContainText("\u20A6");
    await expect(page.getByRole("button", { name: "Pay with Paystack" })).toBeVisible({
      timeout: 20000,
    });
  });
});
