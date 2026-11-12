import { test, expect, type Page } from "@playwright/test";

/**
 * Flow: the admin verification queue at /admin/verify.
 *
 * Three flows are covered, one test each:
 *   1. the "Admin verify" doorway opens the queue, which lists a pending request
 *      with "View proof" / "Approve" / "Reject", and "View proof" reveals the
 *      submitted receipt under the "Proof of payment" heading;
 *   2. approving a request confirms "Request approved", removes it from the queue
 *      and publishes it to the public feed;
 *   3. rejecting a request confirms "Request rejected", removes it from the queue
 *      and keeps it off the public feed.
 *
 * The review ledger lives in the page runtime, so every test loads a fresh page.
 * Only the disposable seeded requests are touched — nothing pre-existing.
 */

const LAGOS = "Lagos Market Fire Relief";
const KANO = "Kano Clinic Roof Repair";

async function openQueue(page: Page): Promise<void> {
  await page.goto("/admin/verify");
  await expect(
    page.getByRole("heading", { name: "Verification queue", level: 1 }),
  ).toBeVisible({ timeout: 20000 });
}

function requestCard(page: Page, title: string) {
  return page.getByTestId("verification-request").filter({ hasText: title });
}

test.describe("admin verification queue @affected", () => {
  test("Admin verify opens the queue and View proof shows the submitted receipt image @affected", async ({
    page,
  }) => {
    // The doorway on the home page really routes into the review desk.
    await page.goto("/");
    const adminLink = page.getByRole("link", { name: "Admin verify" }).first();
    await expect(adminLink).toBeVisible({ timeout: 20000 });
    await adminLink.click();

    await expect(page).toHaveURL(/\/admin\/verify$/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: "Verification queue", level: 1 }),
    ).toBeVisible();

    // The queue lists the pending request with all three review actions.
    const kano = requestCard(page, KANO);
    await expect(kano).toBeVisible({ timeout: 20000 });
    await expect(kano.getByRole("button", { name: "View proof" })).toBeVisible();
    await expect(kano.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
    await expect(kano.getByRole("button", { name: "Reject", exact: true })).toBeVisible();

    // Nothing is expanded until the reviewer asks for the proof.
    await expect(kano.getByRole("heading", { name: "Proof of payment", level: 3 })).toHaveCount(0);

    await kano.getByRole("button", { name: "View proof" }).click();

    // The proof panel opens with the real submitted receipt image, and that
    // image actually decodes (a broken asset would leave naturalWidth at 0).
    const panel = kano.getByTestId("proof-panel");
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: "Proof of payment", level: 3 }),
    ).toBeVisible();

    const receipt = panel.getByRole("img", { name: new RegExp(`proof of payment for ${KANO}`, "i") });
    await expect(receipt).toBeVisible();
    await expect
      .poll(
        async () => receipt.evaluate((element) => (element as HTMLImageElement).naturalWidth),
        { timeout: 15000 },
      )
      .toBeGreaterThan(0);
  });

  test("approving a request confirms Request approved, clears it from the queue and publishes it to the feed @affected", async ({
    page,
  }) => {
    await openQueue(page);

    const lagos = requestCard(page, LAGOS);
    await expect(lagos).toBeVisible({ timeout: 20000 });

    await lagos.getByRole("button", { name: "Approve", exact: true }).click();

    // Confirmation is shown and the decided request leaves the queue.
    await expect(page.getByTestId("admin-flash")).toContainText("Request approved");
    await expect(requestCard(page, LAGOS)).toHaveCount(0);
    await expect(requestCard(page, KANO)).toBeVisible();

    // Client-side navigation keeps the reviewed ledger, so the approved bill is
    // the first card in the feed deck and the pending one never appears.
    await page.getByRole("link", { name: "Bills", exact: true }).first().click();
    await expect(page).toHaveURL(/\/feed$/, { timeout: 20000 });
    await expect(page.getByTestId("feed-title")).toHaveText(LAGOS);
    await expect(page.getByTestId("feed-beneficiary")).toHaveText("Balogun Market Traders");
    await expect(page.getByText(KANO)).toHaveCount(0);
  });

  test("rejecting a request confirms Request rejected, clears it from the queue and keeps it off the feed @affected", async ({
    page,
  }) => {
    await openQueue(page);

    const kano = requestCard(page, KANO);
    await expect(kano).toBeVisible({ timeout: 20000 });

    await kano.getByRole("button", { name: "Reject", exact: true }).click();

    await expect(page.getByTestId("admin-flash")).toContainText("Request rejected");
    await expect(requestCard(page, KANO)).toHaveCount(0);
    await expect(requestCard(page, LAGOS)).toBeVisible();

    // The rejected request must never reach the public feed.
    await page.getByRole("link", { name: "Bills", exact: true }).first().click();
    await expect(page).toHaveURL(/\/feed$/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Verified bills", level: 1 })).toBeVisible();
    await expect(page.getByText(KANO)).toHaveCount(0);
  });
});
