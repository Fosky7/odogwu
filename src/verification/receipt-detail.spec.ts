import { expect, test } from "@playwright/test";

/**
 * Module 5 · step 4 — the receipt detail page.
 *
 * One flow: a donor opens their receipt, reads the receipt itself (the shared
 * receipt card with its "Payment receipt" title, reference number, Naira amount
 * and the Paid status) and then follows "Back to cause" back to the bill it
 * belongs to. Every assertion is made against the real rendered page, so a
 * receipt that loses its reference or prints an unformatted amount fails here.
 */
test.describe("receipt detail @affected", () => {
  test("shows the payment receipt then returns to the bill @affected", async ({ page }) => {
    await page.goto("/receipt/1");

    // 0) The receipt is rendered by the shared receipt card.
    await expect(page.getByTestId("receipt-card")).toBeVisible({ timeout: 20000 });

    // 1) The page identifies itself as a receipt.
    await expect(page.getByRole("heading", { name: "Payment receipt" })).toBeVisible({
      timeout: 20000,
    });

    // 2) A quotable reference number is printed under the "Reference" label.
    await expect(page.getByText("Reference", { exact: true })).toBeVisible();
    const reference = page.getByTestId("receipt-reference");
    await expect(reference).toBeVisible();
    const referenceText = (await reference.innerText()).trim();
    expect(referenceText.length).toBeGreaterThan(0);
    expect(referenceText).toMatch(/[A-Za-z0-9]/);

    // 3) The amount is real money in Naira, not ₦0 and not a raw number.
    const amount = page.getByTestId("receipt-amount");
    await expect(amount).toBeVisible();
    await expect(amount).toContainText("₦");
    const amountNaira = Number((await amount.innerText()).replace(/[^0-9]/g, ""));
    expect(Number.isNaN(amountNaira)).toBe(false);
    expect(amountNaira).toBeGreaterThan(0);

    // 4) The receipt can only exist for cleared money, so it reads as paid.
    await expect(page.getByTestId("receipt-status")).toContainText("Paid");

    // 5) "Back to cause" lands on the bill behind this receipt.
    await page.getByRole("link", { name: "Back to cause" }).click();
    await expect(page).toHaveURL(/\/cause\/1\b/);
    await expect(page.getByRole("heading", { name: "Bill details" })).toBeVisible({
      timeout: 20000,
    });
  });
});
