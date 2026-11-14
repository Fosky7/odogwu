import { test, expect } from "@playwright/test";

/**
 * Every internal link must open its destination at the top of the page: header
 * links, footer links, the brand logo and browser history navigation.
 */
test.describe("scroll reset on navigation", () => {
  test("a footer link opens its destination page at the top @affected", async ({ page }) => {
    await page.goto("/legal/terms");

    const termsHeading = page.getByRole("heading", { level: 1, name: "Terms of Service" });
    await expect(termsHeading).toBeVisible();

    const footer = page.getByTestId("site-footer");
    await expect(footer).toBeVisible();

    // Scroll the long legal document to its very bottom, where the footer lives.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBeGreaterThan(100);

    await footer.getByRole("link", { name: "Privacy Policy", exact: true }).first().click();

    await expect(page).toHaveURL(/\/legal\/privacy$/);

    const privacyHeading = page.getByRole("heading", { level: 1, name: "Privacy Policy" });
    await expect(privacyHeading).toBeVisible();
    await expect(privacyHeading).toBeInViewport();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  });

  test("a header menu link opens its destination page at the top @affected", async ({ page }) => {
    await page.goto("/legal/terms");

    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeVisible();

    // Move well away from the top before following the header link.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBeGreaterThan(100);

    await page.getByTestId("menu-toggle").click();

    const menu = page.getByRole("navigation", { name: "Main" });
    await expect(menu).toBeVisible();

    await menu.getByRole("link", { name: "Bills", exact: true }).click();

    await expect(page).toHaveURL(/\/feed$/);

    // The destination is already at the top and stays there (no upward glide).
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBe(0);
    await expect(page.getByTestId("site-header")).toBeVisible();
  });

  test("the header brand logo opens the home page at the top @affected", async ({ page }) => {
    await page.goto("/legal/privacy");

    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBeGreaterThan(100);

    await page.getByRole("link", { name: "Odogwu home", exact: true }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBe(0);
  });

  test("browser back and forward return to the previous page at the top @affected", async ({ page }) => {
    await page.goto("/legal/privacy");

    const privacyHeading = page.getByRole("heading", { level: 1, name: "Privacy Policy" });
    await expect(privacyHeading).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 })
      .toBeGreaterThan(100);

    await page
      .getByTestId("site-footer")
      .getByRole("link", { name: "Terms of Service", exact: true })
      .first()
      .click();

    await expect(page).toHaveURL(/\/legal\/terms$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/legal\/privacy$/);
    await expect(privacyHeading).toBeInViewport();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);

    await page.goForward();

    await expect(page).toHaveURL(/\/legal\/terms$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInViewport();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  });
});
