import { expect, test } from "@playwright/test";

/**
 * Module 5 · step 3 — the receipt card rendered on a receipt page.
 *
 * The receipt at /receipt/1 was produced by a settled pledge in the seeded
 * ledger, so the page must name itself ("Payment receipt"), print the amount in
 * Naira, show the quotable Reference number and mark the money as Paid. All
 * three facts are read from the rendered card, so a card that renders labels
 * without real values fails here.
 */
test.describe("receipt card @affected", () => {
  test("receipt 1 shows Payment receipt, the Naira amount, a Reference and Paid status @affected", async ({
    page,
  }) => {
    await page.goto("/receipt/1");

    const card = page.getByTestId("receipt-card");
    await expect(card).toBeVisible({ timeout: 20000 });

    // 1) The card names itself.
    await expect(
      page.getByRole("heading", { name: "Payment receipt", level: 1 }),
    ).toBeVisible();

    // 2) The amount is a real Naira figure, not ₦0 and not a placeholder.
    const amount = card.getByTestId("receipt-amount");
    await expect(amount).toBeVisible();
    await expect(amount).toContainText("₦");

    const amountNaira = Number((await amount.innerText()).replace(/[^0-9]/g, ""));
    expect(Number.isNaN(amountNaira)).toBe(false);
    expect(amountNaira).toBeGreaterThan(0);

    // 3) The Reference label carries an actual, quotable payment reference.
    await expect(card.getByText("Reference", { exact: true })).toBeVisible();
    const reference = card.getByTestId("receipt-reference");
    await expect(reference).toHaveText(/^ODG-\d{4}-\d{4}$/);

    // 4) A receipt only exists for money that cleared, so the status reads Paid.
    await expect(card.getByTestId("receipt-status")).toContainText("Paid");
  });
});
