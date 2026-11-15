import { test, expect } from "@playwright/test";

/**
 * Verifies the real user flow behind this change: tapping an internal link
 * while the current page is scrolled down must open the destination page at the
 * very top of the document (no inherited scroll offset, no nested scroll area).
 *
 * The app is exercised through its real UI only - the header hamburger menu and
 * the footer legal column - and every assertion reads the live viewport.
 */

/** Scroll the document to its last pixel through the real page. */
async function scrollToBottom(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    window.scrollTo({ top: doc.scrollHeight, left: 0, behavior: "instant" as ScrollBehavior });
  });
}

/** Current vertical scroll offset of the document. */
async function scrollY(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY || document.documentElement.scrollTop || 0));
}

test.describe("internal links open the destination at the top", () => {
  test("header Bills link opens the bills page at the top of the viewport @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    // The shared shell must be mounted before the navigation can be driven.
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByTestId("site-footer")).toBeVisible();

    // Move the reader away from the top of the current page.
    await scrollToBottom(page);

    // Open the collapsed header menu and follow the real "Bills" link.
    await page.getByTestId("menu-toggle").click();
    const mainMenu = page.getByRole("navigation", { name: "Main" });
    await expect(mainMenu).toBeVisible();
    await mainMenu.getByRole("link", { name: "Bills" }).click();

    await expect(page).toHaveURL(/\/feed$/);

    // The destination page is shown from its first pixel.
    await expect
      .poll(async () => scrollY(page), {
        message: "the bills page should open at the top of the document",
        timeout: 5000,
      })
      .toBe(0);

    await expect(page.getByTestId("site-header")).toBeInViewport();
  });

  test("footer Privacy Policy link opens the legal page at the top of the viewport @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    await expect(page.getByTestId("site-footer")).toBeVisible();

    // Scroll down so the footer legal column is reachable, exactly as a reader
    // would arrive at these links.
    await scrollToBottom(page);

    const legalColumn = page.getByRole("navigation", { name: "Legal" });
    await expect(legalColumn).toBeVisible();
    await legalColumn.getByRole("link", { name: "Privacy Policy" }).click();

    await expect(page).toHaveURL(/\/legal\/privacy$/);

    await expect
      .poll(async () => scrollY(page), {
        message: "the legal page should open at the top of the document",
        timeout: 5000,
      })
      .toBe(0);

    await expect(page.getByTestId("site-header")).toBeInViewport();
  });
});
