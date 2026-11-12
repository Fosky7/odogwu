import { expect, test } from "@playwright/test";

/**
 * Module 5 · step 5 — the receipt doorway from a bill page.
 *
 * One flow, driven against the real rendered pages: a settled pledge on
 * `/cause/1` links to its receipt, the receipt shows "Payment receipt" with a
 * quotable reference, the amount in Naira and a Paid status, and "Back to
 * cause" returns to the bill that was funded.
 */
test.describe("receipts from the bill page @affected", () => {
  test("View receipt opens the paid Payment receipt and Back to cause returns to the bill @affected", async ({
    page,
  }) => {
    await page.goto("/cause/1");
    await expect(page.getByRole("heading", { name: "Bill details", level: 2 })).toBeVisible({
      timeout: 20000,
    });

    // Settled pledges leave a receipt, linked from the funding panel.
    const viewReceipt = page.getByRole("link", { name: /view receipt/i });
    await expect(viewReceipt).toBeVisible({ timeout: 20000 });
    await viewReceipt.click();

    await expect(page).toHaveURL(/\/receipt\/\d+$/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: "Payment receipt", level: 1 }),
    ).toBeVisible();

    // Amount in Naira, a quotable reference and the settled (Paid) status.
    await expect(page.getByTestId("receipt-amount")).toHaveText(/₦[\d,]+/);
    await expect(page.getByTestId("receipt-reference")).toHaveText(/ODG-[\d-]+/);
    await expect(page.getByTestId("receipt-status")).toHaveText(/paid/i);

    // The receipt links back to the bill it settles.
    await page.getByRole("link", { name: /back to cause/i }).click();
    await expect(page).toHaveURL(/\/cause\/1$/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Bill details" })).toBeVisible();
  });
});
