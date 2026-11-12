import { test, expect } from "@playwright/test";

/**
 * Module 8 · step 6 — Pledge and Skip on the feed deck, driven through the real UI.
 *
 * One test per flow:
 *  1. Pledge opens the "Make a pledge" sheet.
 *  2. Skip moves to the next bill card and never opens the sheet.
 *  3. Confirming a pledge shows the "Pay with Paystack" checkout button.
 */

test.describe("feed pledge actions @affected", () => {
  test("Pledge on /feed opens the Make a pledge sheet @affected", async ({ page }) => {
    await page.goto("/feed");

    const pledgeButton = page.getByRole("button", { name: "Pledge", exact: true });
    await expect(pledgeButton).toBeVisible({ timeout: 20000 });

    await expect(page.getByTestId("pledge-sheet")).toHaveCount(0);

    await pledgeButton.click();

    const sheet = page.getByTestId("pledge-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });
    await expect(sheet.getByRole("heading", { name: "Make a pledge" })).toBeVisible();
  });

  test("Skip on /feed moves to the next bill without opening Make a pledge @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    const beneficiary = page.getByTestId("feed-beneficiary");
    await expect(beneficiary).toBeVisible({ timeout: 20000 });

    const firstBeneficiary = (await beneficiary.innerText()).trim();
    const counter = page.getByText(/^\d+ of \d+$/);
    const firstCounter = (await counter.innerText()).trim();

    await page.getByRole("button", { name: "Skip", exact: true }).click();

    // The deck advanced and the sheet was never opened.
    await expect(page.getByTestId("feed-card")).toBeVisible();
    await expect(page.getByTestId("pledge-sheet")).toHaveCount(0);
    await expect(counter).not.toHaveText(firstCounter);

    const nextBeneficiary = (await beneficiary.innerText()).trim();
    expect(nextBeneficiary.length).toBeGreaterThan(0);
    expect(nextBeneficiary).not.toBe(firstBeneficiary);
  });

  test("confirming a pledge in Make a pledge shows the Pay with Paystack button @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    await page.getByRole("button", { name: "Pledge", exact: true }).click();

    const sheet = page.getByTestId("pledge-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });

    const amountField = sheet.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();

    // Read the live balance off the sheet and pledge a small, valid slice of it.
    const remainingText = await sheet.getByTestId("pledge-sheet-remaining").innerText();
    const remainingDigits = remainingText.replace(/[^0-9.]/g, "");
    expect(remainingDigits.length).toBeGreaterThan(0);
    const remaining = Number(remainingDigits);
    expect(remaining).toBeGreaterThanOrEqual(100);

    const pledgeAmount = Math.min(1000, Math.floor(remaining));
    await amountField.fill(String(pledgeAmount));
    await expect(amountField).toHaveValue(String(pledgeAmount));
    await expect(sheet.getByTestId("pledge-sheet-error")).toHaveCount(0);

    await sheet.getByTestId("pledge-sheet-continue").click();

    // The checkout page carries the Paystack button with the pledged amount.
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("button", { name: "Pay with Paystack" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("checkout-amount-due")).toContainText("\u20A6");
  });
});
