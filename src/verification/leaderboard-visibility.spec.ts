import { expect, test } from "@playwright/test";

/**
 * Flows changed by the leaderboard opt-in work:
 *
 *  1. A donor opening the pledge sheet on a bill page sees both leaderboard
 *     privacy choices, and the choice they make survives submitting the pledge.
 *  2. The Leaderboard link in the site navigation opens the "Top Odogwus" page.
 *  3. The privacy policy documents the same two visibility options and says what
 *     is published until somebody opts in.
 *
 * All three flows run signed out: the pledge sheet, the public board and the
 * legal pages are public surfaces, so no disposable account is needed.
 */

test.describe("leaderboard opt-in and navigation @affected", () => {
  test("pledge sheet keeps the Don't rank me choice after submitting @affected", async ({
    page,
  }) => {
    await page.goto("/cause/1");

    // Open the real pledge sheet from the bill detail page.
    await page.getByTestId("pledge-sheet-trigger").click();
    await expect(page.getByTestId("pledge-sheet")).toBeVisible();

    // Both privacy choices must be offered before any money is recorded.
    const showName = page.getByRole("radio", { name: "Show my name" });
    const dontRank = page.getByRole("radio", { name: "Don't rank me" });
    await expect(showName).toBeVisible();
    await expect(dontRank).toBeVisible();

    // Choose the private option.
    await dontRank.check();
    await expect(dontRank).toBeChecked();

    // Make sure a valid disposable amount is present, then submit the pledge.
    const amount = page.getByLabel("Amount", { exact: true });
    if (!(await amount.inputValue()).trim()) {
      await amount.fill("1000");
    }

    await page.getByTestId("pledge-submit").click();

    // The confirmation keeps showing the chosen privacy option.
    await expect(page.getByTestId("pledge-success")).toBeVisible();
    await expect(page.getByTestId("pledge-privacy-choice")).toHaveText(
      "Don't rank me",
    );
  });

  test("Leaderboard link in the site menu opens the Top Odogwus page @affected", async ({
    page,
  }) => {
    await page.goto("/");

    // The section links live inside the collapsed header menu.
    await page.getByTestId("menu-toggle").click();
    const mainNav = page.getByRole("navigation", { name: "Main" });
    const leaderboardLink = mainNav.getByRole("link", {
      name: "Leaderboard",
      exact: true,
    });
    await expect(leaderboardLink).toBeVisible();

    await leaderboardLink.click();

    // A real navigation to the public board, headed "Top Odogwus".
    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Top Odogwus" }),
    ).toBeVisible();
  });

  test("privacy policy documents both leaderboard visibility options @affected", async ({
    page,
  }) => {
    await page.goto("/legal/privacy");

    // The real policy page has to be on screen before its copy can be trusted.
    await expect(
      page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();

    // The leaderboard section is actually rendered.
    await expect(
      page.getByRole("heading", { name: /giving leaderboard/i }),
    ).toBeVisible();

    // Both option labels a donor is offered must be named in the policy.
    await expect(page.getByText(/Show my name/).first()).toBeVisible();
    await expect(page.getByText(/Don't rank me/).first()).toBeVisible();

    // And the policy must say what appears publicly until somebody opts in.
    await expect(page.getByText(/Anonymous Odogwu/).first()).toBeVisible();
  });
});
