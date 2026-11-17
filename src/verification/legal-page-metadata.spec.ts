import { test, expect } from "@playwright/test";

test.describe("legal pages have unique titles and descriptions @affected", () => {
  const pages: Array<{ path: string; heading: RegExp }> = [
    { path: "/legal/privacy", heading: /privacy policy/i },
    { path: "/legal/terms", heading: /terms of service/i },
    { path: "/legal/accessibility", heading: /accessibility statement/i },
  ];

  test("each legal page exposes its own title and meta description @affected", async ({
    page,
  }) => {
    const titles: string[] = [];
    const descriptions: string[] = [];

    for (const entry of pages) {
      await page.goto(entry.path);

      // The page still renders its real H1 landmark.
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(
        entry.heading,
      );

      await expect(page).toHaveTitle(/odogwu/i);
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
      titles.push(title);

      const description = await page
        .locator('meta[name="description"]')
        .first()
        .getAttribute("content");
      expect(description, `missing meta description on ${entry.path}`).toBeTruthy();
      expect((description ?? "").trim().length).toBeGreaterThan(20);
      descriptions.push((description ?? "").trim());
    }

    expect(new Set(titles).size, `reused titles: ${titles.join(" | ")}`).toBe(
      pages.length,
    );
    expect(
      new Set(descriptions).size,
      `reused descriptions: ${descriptions.join(" | ")}`,
    ).toBe(pages.length);
  });
});
