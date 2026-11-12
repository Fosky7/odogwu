import { test, expect } from "@playwright/test";

/**
 * Module 5 · step 3 — the receipt card.
 *
 * The card is what proves a pledge was really settled, so this flow opens the
 * real rendered page at /receipt/1 (the seeded receipt for the first pledge on
 * the featured hospital bill) and asserts what a supporter actually sees: the
 * "Payment receipt" title, the amount printed in Naira and a Reference number.
 */
test.describe("receipt card @affected", () => {
  test("shows Payment receipt, the Naira amount and a Reference @affected", async ({ page }) => {
    await page.goto("/receipt/1");

    const card = page.getByTestId("receipt-card");
    await expect(card).toBeVisible({ timeout: 20000 });

    // 1) The card is titled as a payment receipt.
    await expect(card.getByRole("heading", { name: "Payment receipt", exact: true })).toBeVisible();

    // 2) The amount is printed in Naira as a positive, real value.
    const amount = card.getByTestId("receipt-amount");
    await expect(amount).toBeVisible();
    await expect(amount).toHaveText(/^₦\s?[\d,]+$/);
    const amountValue = Number((await amount.innerText()).replace(/[^\d]/g, ""));
    expect(Number.isFinite(amountValue)).toBe(true);
    expect(amountValue).toBeGreaterThan(0);

    // 3) A "Reference" row carries a real receipt reference number.
    await expect(card.getByText("Reference", { exact: true })).toBeVisible();
    const reference = card.getByTestId("receipt-reference");
    await expect(reference).toBeVisible();
    await expect(reference).toHaveText(/^ODG-[A-Z0-9-]+$/);

    // The status is visible as a settled payment.
    await expect(card.getByTestId("receipt-status")).toHaveText(/Paid/);
  });
});
