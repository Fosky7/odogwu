import { test, expect } from "@playwright/test";

/**
 * Module 8 · step 3 — the usePledge hook drives the amount field on /checkout.
 *
 * The hook is the only thing that knows the prefilled balance and what the
 * person typed, so this spec proves that state survives real interaction: the
 * field opens on the amount still owed, a typed amount is kept exactly as
 * entered, and leaving the field does not reset it.
 */

function nairaTextToNumber(text: string): number {
  const digits = text.replace(/[^0-9.]/g, "");
  return digits ? Number(digits) : 0;
}

test.describe("pledge amount state @affected", () => {
  test("checkout keeps the amount typed into the pledge field @affected", async ({ page }) => {
    // The pledge sheet links here with the balance it wants prefilled.
    await page.goto("/checkout?cause=1&amount=25000");

    await expect(
      page.getByRole("heading", { name: "Complete your pledge", level: 1 }),
    ).toBeVisible({ timeout: 20000 });

    const summary = page.getByTestId("checkout-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Amount due");

    // The amount due is printed in Naira and the hook prefills the field with it.
    const dueText = await page.getByTestId("checkout-amount-due").innerText();
    expect(dueText).toContain("\u20A6");
    const remaining = nairaTextToNumber(dueText);
    expect(remaining).toBeGreaterThanOrEqual(100);

    const amountField = page.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();

    const prefilled = await amountField.inputValue();
    expect(Math.round(Number(prefilled))).toBe(Math.round(remaining));

    // Type a valid amount: the hook must keep exactly what was entered.
    const typed = String(Math.min(1000, Math.max(100, Math.floor(remaining / 2))));
    await amountField.fill(typed);
    await expect(amountField).toHaveValue(typed);
    await expect(page.getByTestId("checkout-error")).toHaveCount(0);

    // Leaving the field keeps the typed value — the hook, not the input's own
    // DOM state, is the source of truth — and the summary still shows what the
    // bill owes in Naira.
    await amountField.blur();
    await expect(amountField).toHaveValue(typed);
    await expect(page.getByTestId("checkout-amount-due")).toContainText("\u20A6");
    await expect(page.getByRole("button", { name: "Pay with Paystack" })).toBeEnabled();
  });
});
