import { expect, test } from "@playwright/test";

/**
 * Module 5 · steps 1, 2 and 5 — the bill detail page's live funding totals and
 * the receipt doorway they expose.
 *
 * One flow, start to finish on the real page: the bill names itself, the Raised
 * total in Naira is the arithmetic sum of the settled pledges listed on the same
 * page (so the newest pledge is genuinely counted), the Donors count is the
 * number of distinct people behind those pledges, the figures survive a full
 * reload (they are read from the stored pledge/receipt ledger, not render-only
 * state), and "View receipt" opens the receipt that proves the money cleared.
 */

/** Amounts are printed like "₦6,250"; the digits are the money. */
function toAmount(text: string): number {
  return Number(text.replace(/[^0-9]/g, ""));
}

test.describe("cause funding summary @affected", () => {
  test("bill 1 shows Bill details, live Raised/Donors totals and opens the latest receipt @affected", async ({
    page,
  }) => {
    await page.goto("/cause/1");

    // The bill detail page names itself, which proves we landed on the right
    // record before checking any of its numbers.
    await expect(page.getByRole("heading", { name: "Bill details" })).toBeVisible({
      timeout: 20000,
    });

    // 1) Raised — a real Naira figure, not ₦0 and not a placeholder.
    await expect(page.getByText("Raised", { exact: true })).toBeVisible();
    const raised = page.getByTestId("funding-raised");
    await expect(raised).toBeVisible();
    await expect(raised).toContainText("₦");

    const raisedText = (await raised.innerText()).trim();
    const raisedNaira = toAmount(raisedText);
    expect(Number.isNaN(raisedNaira)).toBe(false);
    expect(raisedNaira).toBeGreaterThan(0);

    // 2) Donors — at least one person is behind that total.
    const donors = page.getByTestId("funding-donors");
    await expect(donors).toBeVisible();
    await expect(page.getByText("Donors", { exact: true })).toBeVisible();

    const donorsText = (await donors.innerText()).trim();
    const donorCount = toAmount(donorsText);
    expect(Number.isNaN(donorCount)).toBe(false);
    expect(donorCount).toBeGreaterThan(0);

    // 3) The pledge list on the page is the audit trail of the headline total:
    //    the amounts add up to Raised and the donors are the distinct names.
    const rows = page.getByTestId("pledge-row");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    let pledgedTotal = 0;
    const pledgeAmounts: number[] = [];
    const donorNames = new Set<string>();

    for (let index = 0; index < rowCount; index += 1) {
      const row = rows.nth(index);

      const amountText = (await row.getByTestId("pledge-amount").innerText()).trim();
      expect(amountText).toContain("₦");
      const amount = toAmount(amountText);
      expect(amount).toBeGreaterThan(0);

      pledgeAmounts.push(amount);
      pledgedTotal += amount;
      donorNames.add((await row.getByTestId("pledge-donor").innerText()).trim());
    }

    // Raised includes every listed pledge — including the latest one.
    expect(pledgedTotal).toBe(raisedNaira);
    expect(donorNames.size).toBe(donorCount);

    // 4) The newest settled pledge is spelled out and is part of that total.
    const latestPledge = page.getByTestId("funding-latest-pledge");
    await expect(latestPledge).toBeVisible();
    const latestPledgeText = (await latestPledge.innerText()).trim();
    const latestAmountMatch = latestPledgeText.match(/₦[\d,]+/);
    expect(latestAmountMatch).not.toBeNull();

    const latestNaira = toAmount(latestAmountMatch?.[0] ?? "");
    expect(latestNaira).toBeGreaterThan(0);
    expect(raisedNaira).toBeGreaterThanOrEqual(latestNaira);
    expect(pledgeAmounts).toContain(latestNaira);

    // 5) The totals survive a full reload, so they come from the stored
    //    pledge/receipt ledger rather than being invented during one render.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Bill details" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("funding-raised")).toHaveText(raisedText);
    await expect(page.getByTestId("funding-donors")).toHaveText(donorsText);

    // 6) "View receipt" opens the receipt proving the money cleared.
    await page.getByRole("link", { name: "View receipt", exact: true }).click();
    await expect(page).toHaveURL(/\/receipt\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Payment receipt" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("receipt-amount")).toContainText("₦");
    await expect(page.getByTestId("receipt-status")).toContainText("Paid");
  });
});
