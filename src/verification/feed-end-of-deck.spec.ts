import { test, expect } from "@playwright/test";

test.describe("feed end-of-deck state", () => {
  test("@affected feed shows the caught-up state after the last card and Refresh feed restores a bill", async ({
    page,
  }) => {
    await page.goto("/feed");

    await expect(page.getByTestId("feed-card")).toBeVisible();
    const skip = page.getByTestId("feed-skip-button");
    await expect(skip).toBeVisible();

    // Skip through every card until the deck is exhausted. The loop is bounded
    // so a runaway deck cannot hang the test — 25 is well above the deck size.
    const caughtUp = page.getByText("You're all caught up", { exact: true });
    for (let i = 0; i < 25 && !(await caughtUp.isVisible()); i += 1) {
      await skip.click();
    }

    await expect(caughtUp).toBeVisible({ timeout: 10000 });

    // Refresh feed restores a bill card with a Pledge action.
    const refresh = page.getByTestId("feed-refresh-button");
    await expect(refresh).toBeVisible();
    await refresh.click();

    await expect(page.getByTestId("feed-card")).toBeVisible();
    await expect(page.getByTestId("feed-pledge-button")).toBeVisible();
  });

  test("@affected phone-sized feed keeps Pledge and Skip visible without scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/feed");

    const pledge = page.getByTestId("feed-pledge-button");
    const skip = page.getByTestId("feed-skip-button");

    await expect(pledge).toBeVisible();
    await expect(skip).toBeVisible();

    // Both actions sit inside the viewport without any scrolling.
    const viewport = page.viewportSize();
    const pledgeBox = await pledge.boundingBox();
    const skipBox = await skip.boundingBox();
    expect(viewport).not.toBeNull();
    expect(pledgeBox).not.toBeNull();
    expect(skipBox).not.toBeNull();
    if (viewport && pledgeBox && skipBox) {
      expect(pledgeBox.y + pledgeBox.height).toBeLessThanOrEqual(viewport.height);
      expect(skipBox.y + skipBox.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});
