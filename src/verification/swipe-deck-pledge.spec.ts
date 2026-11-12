import { test, expect } from "@playwright/test";

/**
 * Module 8 · step 5 — the home swipe deck's Pledge action opens the real
 * "Make a pledge" sheet (the deck is a separate surface from /feed, so it gets
 * its own single flow rather than a copy of the feed spec).
 *
 * The sheet's remaining balance is read from the rendered sheet, so the test
 * follows whatever the verified bill actually still owes.
 */

test.describe("home deck pledge @affected", () => {
  test("Pledge on the home deck opens Make a pledge with the Amount field @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const deck = page.getByTestId("swipe-deck");
    await expect(deck).toBeVisible({ timeout: 20000 });

    const pledgeButton = deck.getByRole("button", { name: "Pledge", exact: true });
    await expect(pledgeButton).toBeVisible();
    await pledgeButton.click();

    const sheet = page.getByTestId("pledge-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });
    await expect(sheet.getByRole("heading", { name: "Make a pledge" })).toBeVisible();

    const amountField = sheet.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();

    // The amount is prefilled with the balance still owed, in Naira, and the
    // sheet hands off to the Paystack checkout without charging anything here.
    const remainingText = await sheet.getByTestId("pledge-sheet-remaining").innerText();
    expect(remainingText).toContain("\u20A6");
    const remainingDigits = remainingText.replace(/[^0-9.]/g, "");
    expect(remainingDigits.length).toBeGreaterThan(0);
    await expect(amountField).toHaveValue(remainingDigits);

    await expect(sheet.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  });
});
