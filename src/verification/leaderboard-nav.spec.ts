import { test, expect } from "@playwright/test";

/**
 * The shared root shell mounts the header (and therefore the section menu) on
 * every route, so the "Leaderboard" entry must be reachable from /login and
 * /bills as well as from the feed, and choosing it must open the leaderboard.
 *
 * This is a signed-out, read-only navigation flow - no account, no writes.
 */
test.describe("site header section navigation", () => {
  test("the shell header offers Leaderboard on /login and /bills and navigates there from /feed @affected", async ({
    page,
  }) => {
    // 1. The credential screen is still framed by the shared shell, so the full
    //    section menu (Leaderboard included) is available before signing in.
    await page.goto("/login");

    const loginHeader = page.getByTestId("site-header");
    await expect(loginHeader).toBeVisible();

    const loginToggle = page.getByTestId("menu-toggle");
    await expect(loginToggle).toHaveAttribute("aria-expanded", "false");
    await loginToggle.click();
    await expect(loginToggle).toHaveAttribute("aria-expanded", "true");

    const loginMenu = page.getByRole("navigation", { name: "Main" });
    await expect(loginMenu).toBeVisible();
    await expect(loginMenu.getByRole("link", { name: "Causes", exact: true })).toBeVisible();
    await expect(loginMenu.getByRole("link", { name: "Bills", exact: true })).toBeVisible();
    await expect(
      loginMenu.getByRole("link", { name: "Leaderboard", exact: true }),
    ).toBeVisible();
    await expect(
      loginMenu.getByRole("link", { name: "Request a bill", exact: true }),
    ).toBeVisible();

    // Escape closes the menu again, leaving the bar usable.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("site-menu")).toHaveCount(0);
    await expect(loginToggle).toHaveAttribute("aria-expanded", "false");

    // 2. The bills route renders under the same shell header.
    await page.goto("/bills");
    await expect(page.getByTestId("site-header")).toBeVisible();

    await page.getByTestId("menu-toggle").click();
    const billsMenu = page.getByTestId("site-menu");
    await expect(billsMenu).toBeVisible();
    await expect(
      billsMenu.getByRole("link", { name: "Leaderboard", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("site-menu")).toHaveCount(0);

    // 3. From the feed, activate Leaderboard with the keyboard and land on the
    //    real leaderboard page.
    await page.goto("/feed");
    const feedToggle = page.getByTestId("menu-toggle");
    await feedToggle.click();
    await expect(feedToggle).toHaveAttribute("aria-expanded", "true");

    const feedMenu = page.getByRole("navigation", { name: "Main" });
    const leaderboardLink = feedMenu.getByRole("link", {
      name: "Leaderboard",
      exact: true,
    });
    await expect(leaderboardLink).toBeVisible();

    await feedToggle.focus();
    await page.keyboard.press("Tab"); // Causes
    await page.keyboard.press("Tab"); // Bills
    await page.keyboard.press("Tab"); // Leaderboard
    await expect(leaderboardLink).toBeFocused();

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(page.getByTestId("page-content")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /leaderboard/i }),
    ).toBeVisible();

    // Reopening the menu on the leaderboard marks that row as the current page,
    // and not the Bills row.
    await page.getByTestId("menu-toggle").click();
    const currentMenu = page.getByTestId("site-menu");
    await expect(
      currentMenu.getByRole("link", { name: "Leaderboard", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      currentMenu.getByRole("link", { name: "Bills", exact: true }),
    ).not.toHaveAttribute("aria-current", "page");

    // And the footer still offers the leaderboard at the bottom of the page.
    const footer = page.getByTestId("site-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Leaderboard", exact: true }),
    ).toBeVisible();
  });
});
