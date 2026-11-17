import { test, expect } from "@playwright/test";

/**
 * The admin verification page must expose a complete document-head card: one
 * non-empty description, Open Graph tags whose title matches the visible H1,
 * and exactly one Twitter card tag.
 */
test("@affected /admin/verify exposes a complete description and social meta set", async ({
  page,
}) => {
  await page.goto("/admin/verify");

  const heading = page.getByRole("heading", { level: 1, name: "Admin verification" });
  await expect(heading).toBeVisible();

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveCount(1);
  await expect(description).toHaveAttribute("content", /.+/);

  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveCount(1);
  await expect(ogTitle).toHaveAttribute("content", "Admin verification");

  const ogDescription = page.locator('meta[property="og:description"]');
  await expect(ogDescription).toHaveCount(1);
  await expect(ogDescription).toHaveAttribute("content", /.+/);

  const ogType = page.locator('meta[property="og:type"]');
  await expect(ogType).toHaveCount(1);
  await expect(ogType).toHaveAttribute("content", "website");

  const twitterCard = page.locator('meta[name="twitter:card"]');
  await expect(twitterCard).toHaveCount(1);
  await expect(twitterCard).toHaveAttribute("content", "summary_large_image");
});
