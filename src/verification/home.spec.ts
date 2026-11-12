import { test, expect } from "@playwright/test";

/**
 * Module 5 · step 6 — the home page doorways.
 *
 * The home page is the way into the funded causes and their receipts, so these
 * flows drive the real rendered page at "/" and assert what a visitor actually
 * sees and where the links actually take them.
 */
test.describe("home page doorways @affected", () => {
  test("featured cause card shows its Raised total in Naira @affected", async ({ page }) => {
    await page.goto("/");

    // The page rendered its headline.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });

    const card = page.getByTestId("featured-cause-card");
    await expect(card).toBeVisible();

    // 1) A "Raised" label sits beside a real Naira total.
    await expect(card.getByText("Raised", { exact: true })).toBeVisible();
    const raised = card.getByTestId("featured-cause-raised");
    await expect(raised).toBeVisible();
    await expect(raised).toHaveText(/^₦\s?[\d,]+$/);

    const raisedValue = Number((await raised.innerText()).replace(/[^\d]/g, ""));
    expect(Number.isFinite(raisedValue)).toBe(true);
    expect(raisedValue).toBeGreaterThan(0);

    // 2) The same card reports a real donor count.
    await expect(card.getByText("Donors", { exact: true })).toBeVisible();
    await expect(card).toHaveText(/\d+\s+donors?/i);
  });

  test("clicking the featured cause opens the bill page showing Bill details @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.getByTestId("featured-cause-card");
    await expect(card).toBeVisible({ timeout: 20000 });

    await card.getByTestId("featured-cause-link").click();

    // The card opens the featured bill itself…
    await expect(page).toHaveURL(/\/cause\/1$/, { timeout: 20000 });
    // …and that page names itself "Bill details".
    await expect(page.getByRole("heading", { name: "Bill details" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Browse causes opens the causes list with at least one cause card @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const cta = page.getByTestId("browse-causes-cta");
    await expect(cta).toBeVisible({ timeout: 20000 });

    await cta.click();

    await expect(page).toHaveURL(/\/feed$/, { timeout: 20000 });

    // The list really renders causes — each card links to its own bill page.
    const causeCards = page.locator('[data-testid="cause-card"], a[href^="/cause/"]');
    await expect(causeCards.first()).toBeVisible({ timeout: 20000 });
    expect(await causeCards.count()).toBeGreaterThan(0);
  });
});
