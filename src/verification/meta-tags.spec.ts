import { test, expect } from "@playwright/test";

/**
 * Shared document-head contract: every page inherits a single non-empty
 * description, Open Graph and Twitter card set from the root route, and a page
 * that declares its own meta (like /feed or /admin/verify) overrides it without
 * duplicating.
 */
test.describe("shared page metadata", () => {
  test("feed exposes one description and a social card matching its H1", { tag: "@affected" }, async ({
    page,
  }) => {
    await page.goto("/feed");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = ((await heading.textContent()) ?? "").trim();
    expect(headingText.length).toBeGreaterThan(0);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute("content", /\S/);

    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      headingText,
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      /\S/,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "website",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("admin verification route exposes its own description and social card", { tag: "@affected" }, async ({
    page,
  }) => {
    await page.goto("/admin/verify");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = ((await heading.textContent()) ?? "").trim();
    expect(headingText.length).toBeGreaterThan(0);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute("content", /\S/);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    await expect(ogTitle).toHaveAttribute("content", headingText);

    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      /\S/,
    );
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
});
