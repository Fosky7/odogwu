import { expect, test } from "@playwright/test";

/**
 * Module 5 · step 6 — the home page doorway into funded causes and receipts.
 *
 * Flow 1: the featured cause card prints a real Raised total in Naira, and
 *         clicking the card opens that bill (heading "Bill details").
 * Flow 2: "Browse causes" opens the causes list with at least one cause card.
 *
 * Both assertions run against the real rendered home page: the Raised figure is
 * read from the card itself, and navigation is verified by URL + the destination
 * page's own heading/link markup rather than by a mock.
 */
test.describe("home featured cause @affected", () => {
  test("featured card shows Raised in Naira and opens the bill @affected", async ({ page }) => {
    await page.goto("/");

    const card = page.getByTestId("featured-cause-card");
    await expect(card).toBeVisible({ timeout: 20000 });

    // 1) The card labels its total "Raised" and prints it in Naira, not ₦0 and
    //    not a bare number.
    await expect(page.getByText("Raised", { exact: true })).toBeVisible();
    const raised = page.getByTestId("featured-cause-raised");
    await expect(raised).toBeVisible();
    await expect(raised).toContainText("₦");

    const raisedText = (await raised.innerText()).trim();
    const raisedNaira = Number(raisedText.replace(/[^0-9]/g, ""));
    expect(Number.isNaN(raisedNaira)).toBe(false);
    expect(raisedNaira).toBeGreaterThan(0);

    // 2) Clicking the card itself opens the featured bill.
    await card.click();
    await expect(page).toHaveURL(/\/cause\/1\b/);
    await expect(page.getByRole("heading", { name: "Bill details" })).toBeVisible({
      timeout: 20000,
    });
  });

  test("Browse causes opens the causes list with at least one cause card @affected", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("browse-causes-cta").click();

    await expect(page).toHaveURL(/\/feed\b/);

    // Every cause card links to its own bill, so a visible /cause/ link proves
    // the list rendered real records rather than an empty state.
    const firstCauseLink = page.locator('a[href^="/cause/"]').first();
    await expect(firstCauseLink).toBeVisible({ timeout: 20000 });
    await expect(firstCauseLink).toHaveAttribute("href", /\/cause\/[^/]+$/);
  });
});
