import { test, expect } from "@playwright/test";

const pages = [
  { path: "/legal/contact", expectedTitle: "Contact Us", heading: /contact/i },
  { path: "/legal/cookies", expectedTitle: "Cookie Policy", heading: /cookie/i },
  { path: "/legal/donations", expectedTitle: "Donation Policy", heading: /donation|refund/i },
];

test("@affected legal content pages expose distinct titles and descriptions", async ({ page }) => {
  const titles: string[] = [];
  const descriptions: string[] = [];

  for (const entry of pages) {
    await page.goto(entry.path);

    await expect(page).toHaveTitle(new RegExp(entry.expectedTitle, "i"));
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(entry.heading);

    const descriptionTag = page.locator('meta[name="description"]').first();
    await expect(descriptionTag).toHaveCount(1);
    const description = await descriptionTag.getAttribute("content");
    expect(description, `meta description missing on ${entry.path}`).toBeTruthy();
    expect((description ?? "").trim().length).toBeGreaterThan(20);

    titles.push((await page.title()).trim());
    descriptions.push((description ?? "").trim());
  }

  expect(new Set(titles).size).toBe(titles.length);
  expect(new Set(descriptions).size).toBe(descriptions.length);
});
