import { test, expect } from "@playwright/test";

/**
 * Module 8 — the Paystack checkout flow, driven through the real page.
 *
 * The route is registered in the app shell, so the test opens `/checkout`
 * DIRECTLY (no query string) and expects the "Amount due" summary to render.
 * The balance is read off that summary (never hard-coded), so the test follows
 * whatever the verified bill actually owes. It then proves the two behaviours
 * the step is judged on: an amount above the balance is refused with the exact
 * copy, and a valid amount settles the pledge and leaves a receipt.
 */

function nairaTextToNumber(text: string): number {
  const digits = text.replace(/[^0-9.]/g, "");
  return digits ? Number(digits) : 0;
}

test.describe("checkout pledge flow @affected", () => {
  test("refuses an overpayment and settles a valid Paystack pledge into a receipt @affected", async ({
    page,
  }) => {
    // Opened by address: the shell renders the checkout page it owns.
    await page.goto("/checkout");

    await expect(
      page.getByRole("heading", { name: "Complete your pledge", level: 1 }),
    ).toBeVisible({ timeout: 20000 });

    const summary = page.getByTestId("checkout-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Amount due");

    const amountField = page.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay with Paystack" })).toBeVisible();

    // The amount due is printed in Naira and the field is prefilled with it.
    const dueText = await page.getByTestId("checkout-amount-due").innerText();
    expect(dueText).toContain("\u20A6");
    const remaining = nairaTextToNumber(dueText);
    expect(remaining).toBeGreaterThanOrEqual(100);

    const prefilled = await amountField.inputValue();
    expect(Math.round(Number(prefilled))).toBe(Math.round(remaining));

    // Paying more than the bill still owes is refused with the exact copy.
    await amountField.fill(String(Math.round(remaining) + 1000));
    await expect(page.getByTestId("checkout-error")).toHaveText(
      "Amount exceeds the remaining balance",
    );

    // A valid amount clears the error, and paying settles the pledge.
    const pledgeAmount = Math.min(Math.round(remaining), 5000);
    await amountField.fill(String(pledgeAmount));
    await expect(page.getByTestId("checkout-error")).toHaveCount(0);

    await page.getByRole("button", { name: "Pay with Paystack" }).click();

    await expect(page.getByRole("heading", { name: "Payment successful" })).toBeVisible({
      timeout: 30000,
    });

    const success = page.getByTestId("checkout-success");
    await expect(success).toContainText(`\u20A6${pledgeAmount.toLocaleString("en-US")}`);
    await expect(page.getByTestId("checkout-reference")).not.toBeEmpty();

    // The settled pledge left a real receipt: the link opens the receipt page
    // and the shared receipt card renders instead of "Receipt not found".
    await page.getByRole("link", { name: "View your receipt" }).click();
    await expect(page).toHaveURL(/\/receipt\/.+/);
    await expect(page.getByTestId("receipt-card")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Receipt not found" })).toHaveCount(0);
  });
});
