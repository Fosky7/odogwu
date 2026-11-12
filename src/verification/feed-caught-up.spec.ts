import { test, expect } from "@playwright/test";

test.describe("feed end-of-deck state @affected", () => {
  test("skipping every bill shows You're all caught up and Refresh feed restores a card @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    // The deck starts on a real verified bill.
    await expect(page.getByTestId("feed-card")).toBeVisible({ timeout: 20000 });

    const skip = page.getByTestId("feed-skip-button");
    const caughtUp = page.getByTestId("feed-empty-state");

    // Skip through the deck until the caught-up panel appears.
    for (let i = 0; i < 30; i += 1) {
      if (await caughtUp.isVisible().catch(() => false)) break;
      await skip.click();
    }

    await expect(caughtUp).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "You're all caught up", exact: true }),
    ).toBeVisible();

    const refresh = page.getByTestId("feed-refresh-button");
    await expect(refresh).toBeVisible();
    await refresh.click();

    // Refreshing rebuilds the deck from the top.
    await expect(page.getByTestId("feed-card")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("feed-beneficiary")).toBeVisible();
  });
});

test.describe("feed mobile action bar @affected", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Pledge and Skip are visible without scrolling on a phone screen @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    const pledge = page.getByTestId("feed-pledge-button");
    const skip = page.getByTestId("feed-skip-button");

    await expect(pledge).toBeVisible({ timeout: 20000 });
    await expect(skip).toBeVisible();
    await expect(pledge).toBeInViewport();
    await expect(skip).toBeInViewport();
  });
});
