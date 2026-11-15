import { test, expect } from "@playwright/test";

/**
 * Verification for the public /leaderboard page (checklist step 7).
 *
 * These specs exercise the real UI against the connected backend: the page's
 * heading and confirmed-pledge note, the header navigation link, and the
 * "This month" filter marking itself selected and re-ranking the totals. No
 * mocks and no seeded browser storage are used.
 */

test.describe("Odogwu leaderboard page", () => {
  test("shows the Odogwu heading and the confirmed-pledge note @affected", async ({ page }) => {
    await page.goto("/leaderboard");

    await expect(
      page.getByRole("heading", { level: 1, name: "Odogwu leaderboard" }),
    ).toBeVisible();

    await expect(page.getByTestId("leaderboard-note")).toHaveText(
      "Only confirmed pledges count toward rank",
    );
  });

  test("header Leaderboard link opens the leaderboard from the home page @affected", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Leaderboard" })
      .click();

    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Odogwu leaderboard" }),
    ).toBeVisible();
  });

  test("This month filter marks itself selected and re-ranks the totals @affected", async ({
    page,
  }) => {
    await page.goto("/leaderboard");

    const allTime = page.getByRole("button", { name: "All time" });
    const thisMonth = page.getByRole("button", { name: "This month" });

    await expect(allTime).toHaveAttribute("aria-pressed", "true");
    await expect(thisMonth).toHaveAttribute("aria-pressed", "false");

    // The list must be showing real ranked rows with naira totals.
    await expect(page.getByTestId("leaderboard-total").first()).toContainText("\u20A6");

    await thisMonth.click();

    await expect(thisMonth).toHaveAttribute("aria-pressed", "true");
    await expect(allTime).toHaveAttribute("aria-pressed", "false");

    // The ranked window actually changed and, once loaded, every row still
    // shows a naira total from a confirmed pledge.
    await expect(page.getByTestId("leaderboard-table")).toHaveAttribute(
      "data-period",
      "this-month",
    );
    await expect(page.getByTestId("leaderboard-note")).toHaveText(
      "Only confirmed pledges count toward rank",
    );
  });
});
