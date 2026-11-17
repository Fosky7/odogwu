import { test, expect } from "@playwright/test";

/**
 * /bills must expose a complete document-head metadata set: exactly one
 * non-empty description, the Open Graph title/description/type, and the
 * Twitter card - with og:title matching the visible H1 rather than the
 * site-wide fallback.
 */
test("@affected /bills exposes description, Open Graph and Twitter card meta", async ({
  page,
}) => {
  await page.goto("/bills");

  const heading = page.getByRole("heading", { level: 1, name: "Bills" });
  await expect(heading).toBeVisible();

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveCount(1);
  await expect(description).toHaveAttribute("content", /\S/);

  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveCount(1);
  await expect(ogTitle).toHaveAttribute("content", "Bills");

  const ogDescription = page.locator('meta[property="og:description"]');
  await expect(ogDescription).toHaveCount(1);
  await expect(ogDescription).toHaveAttribute("content", /\S/);

  const ogType = page.locator('meta[property="og:type"]');
  await expect(ogType).toHaveCount(1);
  await expect(ogType).toHaveAttribute("content", "website");

  const twitterCard = page.locator('meta[name="twitter:card"]');
  await expect(twitterCard).toHaveCount(1);
  await expect(twitterCard).toHaveAttribute("content", "summary_large_image");
});
