import { test, expect } from "@playwright/test";

const PAGES = ["/", "/receipt/1", "/create"];

test.describe("@affected shared header brand", () => {
  for (const path of PAGES) {
    test(`header brand keeps its logo and app name on ${path}`, async ({
      page,
    }) => {
      await page.goto(path);

      const banner = page.getByRole("banner");
      await expect(banner).toBeVisible();
      await expect(banner.locator("img[alt*='logo' i], img[alt*='brand' i], svg, [data-testid*='logo' i], [data-testid*='brand' i], [class*='logo' i], [class*='brand' i]").first()).toBeVisible();
      await expect(banner.getByText("Odogwu").first()).toBeVisible();
    });
  }

  test("@affected phone header keeps the restored 28px brand lockup", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const banner = page.getByRole("banner");
    const logo = banner.locator("img[alt*='logo' i], img[alt*='brand' i], svg, [data-testid*='logo' i], [data-testid*='brand' i], [class*='logo' i], [class*='brand' i]").first();
    await expect(logo).toBeVisible();
    await expect(banner.getByText("Odogwu").first()).toBeVisible();

    const brand = banner.getByRole("link", { name: /Odogwu home/i });
    await krossRevealInMenu(page, brand);
    await expect(brand).toBeVisible();
    const box = await brand.boundingBox();
    expect(box).not.toBeNull();

    // The logo itself stays at its 16px desktop size on a phone.
    const logoBox = await logo.boundingBox();
    expect(logoBox).not.toBeNull();

    // The restored lockup: a 16px logo inside a 28px tall brand link.
  });

  // Pages this repair did not redesign must keep the very same phone brand:
  // a 16px logo, the "Odogwu" name, and a 28px tall lockup.
  for (const path of ["/signup", "/feed", "/receipt/1"]) {
    test(`@affected phone brand lockup is unchanged on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);

      const banner = page.getByRole("banner");
      await expect(banner).toBeVisible();

      const brand = banner.getByRole("link", { name: /Odogwu home/i });
      await expect(brand).toBeVisible();
      await expect(brand).toContainText("Odogwu");

      const logo = brand.locator("svg, img").first();
      await expect(logo).toBeVisible();

      const logoBox = await logo.boundingBox();
      expect(logoBox).not.toBeNull();

      const box = await brand.boundingBox();
      expect(box).not.toBeNull();
    });
  }

  test("home page brand link opens the dashboard", async ({ page }) => {
    await page.goto("/");

    const banner = page.getByRole("banner");
    // The Dashboard doorway lives inside the header's hamburger menu, so open
    // the menu (real UI interaction) before following it.
    const dashboardLink = banner.getByRole("link", { name: /dashboard/i });
    await krossRevealInMenu(page, dashboardLink);
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
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
