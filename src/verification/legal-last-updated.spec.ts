import { test, expect } from "@playwright/test";

/**
 * One flow: the "Last updated" line on every legal page must read
 * "November 12, 2026". The date is passed to the shared LegalDocument
 * component by each legal route, so the check asserts the real rendered text.
 */
const legalPages = [
  { path: "/legal/terms", heading: /terms of service/i },
  { path: "/legal/privacy", heading: /privacy policy/i },
  { path: "/legal/cookies", heading: /cookie/i },
  { path: "/legal/donations", heading: /donation/i },
  { path: "/legal/accessibility", heading: /accessibility/i },
  { path: "/legal/contact", heading: /contact/i },
];

test("@affected legal pages show November 12, 2026 as the last updated date", async ({ page }) => {
  for (const legalPage of legalPages) {
    await page.goto(legalPage.path, { waitUntil: "domcontentloaded" });

    // The intended page rendered (real landmark, not a blank shell).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(legalPage.heading);

    // The date itself is visible on the page.
    await expect(page.getByText("November 12, 2026").first()).toBeVisible();

    // The visible "Last updated" line carries the new date (allowing the label
    // and the date to sit in adjacent nodes).
    const visibleText = await page.locator("main, body").first().innerText();
    expect(visibleText).toMatch(/last updated[\s\S]{0,40}november 12, 2026/i);
  }
});
