import { test, expect, type Page } from "@playwright/test";

/**
 * Is the document (the app's one and only scroll container) parked at its very
 * first pixel? Reads both `window.scrollY` and the scrolling element so a nested
 * scroller cannot make the page look "at the top" while it is not.
 */
async function documentIsAtTop(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scroller = document.scrollingElement ?? document.documentElement;
    return Math.round(scroller.scrollTop) === 0 && Math.round(window.scrollY) === 0;
  });
}

test.describe("links open their page at the top", () => {
  test("a footer link opens the destination page scrolled to the top @affected", async ({
    page,
  }) => {
    await page.goto("/");

    // The shared shell must be present: sticky header, page content, footer.
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByTestId("site-footer")).toBeVisible();

    // Scroll the document itself as far down as it goes.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });

    const privacyLink = page
      .getByTestId("site-footer")
      .getByRole("link", { name: "Privacy Policy" });
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();

    // Real navigation to the legal page, still inside the same document shell.
    await expect(page).toHaveURL(/\/legal\/privacy\/?$/);
    await expect(page.getByTestId("site-header")).toBeVisible();

    // The destination page starts at the top, not at the previous offset.
    await expect.poll(() => documentIsAtTop(page)).toBe(true);
  });
});
