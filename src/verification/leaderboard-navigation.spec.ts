import { test, expect } from "@playwright/test";

/**
 * The leaderboard has to be reachable from anywhere in the app, so the shared
 * shell carries the doorway: the header menu and the footer both link to it.
 *
 * The test performs the real navigation (open the menu, click the link) and
 * asserts what the user lands on, that the current section is marked for
 * assistive tech while its siblings are not, and that the footer repeats the
 * link. Base URL comes from the Playwright config; no credentials are needed
 * because the leaderboard is public.
 */
test("header and footer Leaderboard links open the leaderboard @affected", async ({
  page,
}) => {
  const heading = () => page.getByRole("heading", { level: 1, name: "Odogwu leaderboard" });

  // Start on the home page with the shared header mounted.
  await page.goto("/");
  await expect(page.getByTestId("site-header")).toBeVisible();

  // The section links live inside the menu on every breakpoint.
  await page.getByTestId("menu-toggle").click();

  const menu = page.getByRole("navigation", { name: "Main" });
  const menuLeaderboard = menu.getByRole("link", { name: "Leaderboard", exact: true });
  await expect(menuLeaderboard).toBeVisible();

  await menuLeaderboard.click();

  await expect(page).toHaveURL(/\/leaderboard\/?$/);
  await expect(heading()).toBeVisible();

  // Re-open the menu: this section is the current page, the others are not.
  await page.getByTestId("menu-toggle").click();
  const activeMenu = page.getByRole("navigation", { name: "Main" });
  const activeLeaderboard = activeMenu.getByRole("link", {
    name: "Leaderboard",
    exact: true,
  });
  await expect(activeLeaderboard).toHaveAttribute("aria-current", "page");
  await expect(
    activeMenu.getByRole("link", { name: "Bills", exact: true }),
  ).not.toHaveAttribute("aria-current", "page");

  // Keyboard users can focus the link and see where focus went.
  await activeLeaderboard.focus();
  await expect(activeLeaderboard).toBeFocused();

  // The footer repeats the doorway at the bottom of every page.
  const footer = page.getByTestId("site-footer");
  await footer.scrollIntoViewIfNeeded();
  const footerLeaderboard = footer.getByRole("link", {
    name: "Leaderboard",
    exact: true,
  });
  await expect(footerLeaderboard).toBeVisible();

  await footerLeaderboard.click();
  await expect(heading()).toBeVisible();
});
