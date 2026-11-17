import { test, expect } from "@playwright/test";

/**
 * Meta defaults must survive a client-side navigation (no full reload), because
 * the shared shell is what re-asserts the description / Open Graph / Twitter
 * tags on every route change. Existing specs cover /feed after a direct load;
 * this one covers the in-app navigation flow.
 */
test("@affected feed keeps a complete meta set after in-app navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("site-footer")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Platform" })
    .getByRole("link", { name: "Bills feed" })
    .click();

  await expect(page).toHaveURL(/\/feed$/);
  const heading = page.getByRole("heading", { level: 1, name: "Verified bills" });
  await expect(heading).toBeVisible();

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveCount(1);
  await expect(description).toHaveAttribute("content", /.+/);

  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveCount(1);
  await expect(ogTitle).toHaveAttribute("content", "Verified bills");

  const ogDescription = page.locator('meta[property="og:description"]');
  await expect(ogDescription).toHaveCount(1);
  await expect(ogDescription).toHaveAttribute("content", /.+/);

  await expect(page.locator('meta[property="og:type"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});
