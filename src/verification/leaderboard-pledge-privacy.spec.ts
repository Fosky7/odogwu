import { test, expect } from "@playwright/test";

test.describe("leaderboard and pledge privacy @affected", () => {
  test("header Leaderboard link opens the Top Odogwus board @affected", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("site-header")).toBeVisible();
    await page.getByTestId("menu-toggle").click();

    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Leaderboard" }).click();

    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(
      page.getByRole("heading", { name: "Top Odogwus", exact: true }),
    ).toBeVisible();
  });

  test("pledge sheet keeps the Don't rank me choice after submitting @affected", async ({
    page,
  }) => {
    await page.goto("/cause/1");
    await expect(page.getByTestId("cause-title")).toBeVisible();

    await page.getByTestId("pledge-open").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole("radio", { name: "Show my name" })).toBeVisible();
    const optOut = dialog.getByRole("radio", { name: "Don't rank me" });
    await expect(optOut).toBeVisible();
    await optOut.check();

    await dialog.getByTestId("pledge-submit").click();

    await expect(dialog.getByTestId("pledge-sheet-saved-choice")).toContainText(
      "Don't rank me",
    );
  });
});
