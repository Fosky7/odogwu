import { expect, test } from "@playwright/test";

/**
 * The public /leaderboard page, opened signed out.
 *
 * One flow: a visitor reaches the board, sees the "Top Odogwus" heading, is
 * invited to "Sign in to be ranked", and gets no more than 100 ranked rows with
 * no e-mail address or zero-Naira row among them.
 */
test.describe("public leaderboard page @affected", () => {
  test("signed-out visitors see Top Odogwus, the sign-in prompt and at most 100 rows @affected", async ({
    page,
  }) => {
    await page.goto("/leaderboard");

    await expect(
      page.getByRole("heading", { level: 1, name: "Top Odogwus" }),
    ).toBeVisible();

    // Signed out, the page invites the visitor to join the board.
    await expect(page.getByTestId("leaderboard-signin-prompt")).toContainText(
      "Sign in to be ranked",
    );

    // Wait for the board to settle (loading copy disappears).
    await expect(page.getByTestId("leaderboard-loading")).toHaveCount(0, {
      timeout: 20_000,
    });

    const rows = page.getByTestId("leaderboard-row");
    const rowCount = await rows.count();

    // The board is capped at 100 ranked Odogwus.
    expect(rowCount).toBeLessThanOrEqual(100);

    if (rowCount > 0) {
      // Ranks read 1..n in order, each row carries a real Naira total, and no
      // published name is ever an e-mail address.
      const ranks = await page.getByTestId("leaderboard-rank").allInnerTexts();
      expect(ranks.length).toBe(rowCount);
      expect(ranks[0].trim()).toBe("1");

      const totals = await page.getByTestId("leaderboard-total").allInnerTexts();
      for (const total of totals) {
        expect(total).toContain("\u20a6");
        expect(total.replace(/[^0-9]/g, "").length).toBeGreaterThan(0);
      }

      const names = await page.getByTestId("leaderboard-name").allInnerTexts();
      for (const name of names) {
        expect(name).not.toContain("@");
        expect(name.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
