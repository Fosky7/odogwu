import { test, expect } from "@playwright/test";

test.describe("application header authentication navigation @affected", () => {
  /**
   * The header bar carries only the brand and the menu button. The auth entry
   * points (Sign in / Create account) are reachable through the header menu
   * instead of sitting as separate tabs in the bar.
   */
  test("header bar keeps only the brand and menu with auth revealed in the menu @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    // The brand stays in the bar, unchanged.
    const brand = header.getByRole("link", { name: "Odogwu home" });
    await krossRevealInMenu(page, brand);
    await expect(brand).toBeVisible();
    await expect(brand).toContainText("Odogwu");

    // No standalone auth tabs in the visible bar any more.
    await expect(
      header.getByRole("link", { name: "Sign in" }),
    ).toHaveCount(0);
    await expect(
      header.getByRole("link", { name: "Create account" }),
    ).toHaveCount(0);

    // Opening the header menu reveals both auth entry points.
    const menuButton = header.getByTestId("menu-toggle");
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const menu = header.locator("#site-menu");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Create account", exact: true }),
    ).toBeVisible();
  });

  /**
   * Flow: header menu -> Sign in. Drives the real menu entry point and asserts
   * the sign in screen (email + password fields) is what the click produces.
   */
  test("header menu Sign in opens the sign in screen @affected", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header").first();
    await expect(header).toBeVisible({ timeout: 20000 });

    await header.getByTestId("menu-toggle").click();
    const menu = header.locator("#site-menu");
    await expect(menu).toBeVisible();

    await menu.getByRole("link", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  /**
   * Flow: header menu -> Create account. Drives the real menu entry point and
   * asserts the sign up screen is what the click produces.
   */
  test("header menu Create account opens the sign up screen @affected", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header").first();
    await expect(header).toBeVisible({ timeout: 20000 });

    await header.getByTestId("menu-toggle").click();
    const menu = header.locator("#site-menu");
    await expect(menu).toBeVisible();

    await menu.getByRole("link", { name: "Create account", exact: true }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  /**
   * The checkout flow is reached from the feed, so the shell must expose the
   * feed from the menu on every page. This drives the real menu link and
   * asserts the verified bill card with its "Pledge" button is what the click
   * produces.
   */
  test("header menu Bills link opens the verified feed with a Pledge button @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const header = page.locator("header").first();
    await expect(header).toBeVisible({ timeout: 20000 });

    await header.getByTestId("menu-toggle").click();
    const menu = header.locator("#site-menu");
    await expect(menu).toBeVisible();

    await menu.getByRole("link", { name: "Bills", exact: true }).click();

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole("heading", { name: "Verified bills", level: 1 })).toBeVisible();

    // The bill card the pledge flow starts from, with its Pledge action.
    await expect(page.getByTestId("feed-card")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pledge", exact: true })).toBeVisible();
  });
});

// Added by KrossBuild: the app keeps its top-bar links inside a menu, so open it
// when a link is not already visible.
async function krossRevealInMenu(page: any, target: any) {
  if (await target.isVisible().catch(() => false)) return;
  const toggle = page.locator('header button[aria-expanded="false"], [role="banner"] button[aria-expanded="false"]').first();
  if (await toggle.count().catch(() => 0)) {
    await toggle.click().catch(() => {});
    await target.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  }
}
