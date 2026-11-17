import { test, expect } from "@playwright/test";

test.describe("@affected page meta", () => {
  test("@affected /bills exposes description, og and twitter meta", async ({ page }) => {
    await page.goto("/bills");

    const h1 = page.getByRole("heading", { level: 1, name: "Bills" });
    await expect(h1).toBeVisible();
    const headingText = (await h1.textContent())?.trim() ?? "";
    expect(headingText.length).toBeGreaterThan(0);

    const description = page.locator('head meta[name="description"]');
    await expect(description).toHaveCount(1);
    const descriptionContent = (await description.getAttribute("content"))?.trim() ?? "";
    expect(descriptionContent.length).toBeGreaterThan(0);

    const ogTitle = page.locator('head meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    expect((await ogTitle.getAttribute("content"))?.trim()).toBe(headingText);

    const ogDescription = page.locator('head meta[property="og:description"]');
    await expect(ogDescription).toHaveCount(1);
    expect(((await ogDescription.getAttribute("content")) ?? "").trim().length).toBeGreaterThan(0);

    const ogType = page.locator('head meta[property="og:type"]');
    await expect(ogType).toHaveCount(1);
    expect((await ogType.getAttribute("content"))?.trim()).toBe("website");

    const twitterCard = page.locator('head meta[name="twitter:card"]');
    await expect(twitterCard).toHaveCount(1);
    expect((await twitterCard.getAttribute("content"))?.trim()).toBe("summary_large_image");
  });

  test("@affected /admin/verify exposes description, og and twitter meta", async ({ page }) => {
    await page.goto("/admin/verify");

    const h1 = page.getByRole("heading", { level: 1, name: "Admin verification" });
    await expect(h1).toBeVisible();
    const headingText = (await h1.textContent())?.trim() ?? "";
    expect(headingText.length).toBeGreaterThan(0);

    const description = page.locator('head meta[name="description"]');
    await expect(description).toHaveCount(1);
    const descriptionContent = (await description.getAttribute("content"))?.trim() ?? "";
    expect(descriptionContent.length).toBeGreaterThan(0);

    const ogTitle = page.locator('head meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    expect((await ogTitle.getAttribute("content"))?.trim()).toBe(headingText);

    const ogDescription = page.locator('head meta[property="og:description"]');
    await expect(ogDescription).toHaveCount(1);
    expect(((await ogDescription.getAttribute("content")) ?? "").trim().length).toBeGreaterThan(0);

    const ogType = page.locator('head meta[property="og:type"]');
    await expect(ogType).toHaveCount(1);
    expect((await ogType.getAttribute("content"))?.trim()).toBe("website");

    const twitterCard = page.locator('head meta[name="twitter:card"]');
    await expect(twitterCard).toHaveCount(1);
    expect((await twitterCard.getAttribute("content"))?.trim()).toBe("summary_large_image");
  });
});
