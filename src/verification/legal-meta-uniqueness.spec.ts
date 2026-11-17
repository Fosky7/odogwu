import { test, expect } from "@playwright/test";

type LegalPage = {
  path: string;
  heading: string;
};

const legalPages: LegalPage[] = [
  { path: "/legal/privacy", heading: "Privacy Policy" },
  { path: "/legal/terms", heading: "Terms of Service" },
  { path: "/legal/cookies", heading: "Cookie Policy" },
  { path: "/legal/donations", heading: "Donation" },
  { path: "/legal/contact", heading: "Contact" },
  { path: "/legal/accessibility", heading: "Accessibility" },
];

test("each legal page has a unique document title and meta description @affected", async ({
  page,
}) => {
  const titles: { path: string; title: string }[] = [];
  const descriptions: { path: string; description: string }[] = [];

  for (const legalPage of legalPages) {
    await page.goto(legalPage.path);

    // The page itself really rendered (not an error/blank shell).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const title = await page.title();
    expect(title.trim().length, `empty tab title on ${legalPage.path}`).toBeGreaterThan(0);
    expect(
      title.toLowerCase(),
      `tab title on ${legalPage.path} should mention ${legalPage.heading}`,
    ).toContain(legalPage.heading.toLowerCase().split(" ")[0]);

    const description = await page
      .locator('meta[name="description"]')
      .first()
      .getAttribute("content");
    expect(
      (description ?? "").trim().length,
      `missing meta description on ${legalPage.path}`,
    ).toBeGreaterThan(0);

    titles.push({ path: legalPage.path, title: title.trim() });
    descriptions.push({ path: legalPage.path, description: (description ?? "").trim() });
  }

  // No two legal pages may share the same title.
  const uniqueTitles = new Set(titles.map((entry) => entry.title));
  expect(
    uniqueTitles.size,
    `duplicate legal page titles: ${JSON.stringify(titles)}`,
  ).toBe(titles.length);

  // No two legal pages may share the same description.
  const uniqueDescriptions = new Set(descriptions.map((entry) => entry.description));
  expect(
    uniqueDescriptions.size,
    `duplicate legal page descriptions: ${JSON.stringify(descriptions)}`,
  ).toBe(descriptions.length);
});
