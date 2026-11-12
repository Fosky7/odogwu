import { test, expect } from "@playwright/test";

/**
 * Module 10 — polished empty states.
 * Verifies the donor dashboard shows the new-donor empty state and that its
 * call to action opens the bill feed.
 */
test.describe("empty states @affected", () => {
  test("dashboard shows No pledges yet with a Browse bills action @affected", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("No pledges yet", { exact: false })).toBeVisible();

    const browseAction = page
      .getByRole("link", { name: /browse bills/i })
      .or(page.getByRole("button", { name: /browse bills/i }));

    await expect(browseAction).toBeVisible();
    await browseAction.click();

    await expect(page).toHaveURL(/\/feed$/);
  });
});
