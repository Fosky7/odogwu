import { test, expect, type Page } from "@playwright/test";

/** Trimmed content of every <meta> matching the given attribute/key pair. */
async function metaContents(page: Page, attribute: "name" | "property", key: string) {
  const nodes = page.locator(`meta[${attribute}="${key}"]`);
  const count = await nodes.count();
  const contents: string[] = [];
  for (let i = 0; i < count; i += 1) {
    contents.push(((await nodes.nth(i).getAttribute("content")) ?? "").trim());
  }
  return contents;
}

/**
 * The document head of a page must carry exactly one non-empty description, a
 * non-empty og:title / og:description, og:type "website" and a twitter:card of
 * "summary_large_image" — with og:title matching the visible H1.
 */
async function expectCompletePageMeta(page: Page) {
  const heading = page.locator("h1").first();
  await expect(heading).toBeVisible();
  const headingText = ((await heading.textContent()) ?? "").trim();
  expect(headingText.length).toBeGreaterThan(0);

  const descriptions = await metaContents(page, "name", "description");
  expect(descriptions).toHaveLength(1);
  expect(descriptions[0].length).toBeGreaterThan(0);

  const ogTitles = await metaContents(page, "property", "og:title");
  expect(ogTitles).toHaveLength(1);
  expect(ogTitles[0]).toBe(headingText);

  const ogDescriptions = await metaContents(page, "property", "og:description");
  expect(ogDescriptions).toHaveLength(1);
  expect(ogDescriptions[0].length).toBeGreaterThan(0);

  const ogTypes = await metaContents(page, "property", "og:type");
  expect(ogTypes).toHaveLength(1);
  expect(ogTypes[0]).toBe("website");

  const twitterCards = await metaContents(page, "name", "twitter:card");
  expect(twitterCards).toHaveLength(1);
  expect(twitterCards[0]).toBe("summary_large_image");
}

test("@affected admin verification page exposes description and social meta", async ({ page }) => {
  await page.goto("/admin/verify", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Admin verification", level: 1 })).toBeVisible();
  await expectCompletePageMeta(page);
});

test("@affected bills page exposes description and social meta", async ({ page }) => {
  await page.goto("/bills", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bills", level: 1 })).toBeVisible();
  await expectCompletePageMeta(page);
});
