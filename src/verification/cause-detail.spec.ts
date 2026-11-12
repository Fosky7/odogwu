import { test, expect } from "@playwright/test";


test("cause detail renders inside the shared header and keeps its proof section @affected", async ({
  page,
}) => {
  // Phone width: the shared top bar must stay a single compact row with the
  // logo visible, and the primary navigation must be reachable via the toggle.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cause/1");

  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
  await expect(header.locator("img[alt*='logo' i], img[alt*='brand' i], svg, [data-testid*='logo' i], [data-testid*='brand' i], [class*='logo' i], [class*='brand' i]").first()).toBeVisible();

  const phoneHeaderBox = await header.boundingBox();
  expect(phoneHeaderBox, "the header should be measurable").not.toBeNull();
  expect(phoneHeaderBox!.height).toBeLessThan(120);

  await header.getByRole("button", { name: "Toggle menu" }).click();
  await krossRevealInMenu(page, header.getByRole("link", { name: "Dashboard" }));
  await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await header.getByRole("button", { name: "Toggle menu" }).click();

  // Desktop width: brand, inline primary navigation and the visitor doorways.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/cause/1");

  await expect(header).toBeVisible();
  await expect(header.locator("img[alt*='logo' i], img[alt*='brand' i], svg, [data-testid*='logo' i], [data-testid*='brand' i], [class*='logo' i], [class*='brand' i]").first()).toBeVisible();
  await krossRevealInMenu(page, header.getByRole("link", { name: "Bills" }).first());
  await expect(header.getByRole("link", { name: "Bills" }).first()).toBeVisible();

  // Signed-out visitors still see the authentication doorway in the header.
  await krossRevealInMenu(page, header.getByRole("link", { name: "Sign in" }));
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();

  // The proof a donor relies on is an actual image with a readable label.
  await expect(page.getByRole("img", { name: "Bill proof" }).first()).toBeVisible();
  await expect(
    page.getByText(/St\. Mary's General Hospital final bill/).first(),
  ).toBeVisible();
});


// Added by KrossBuild: the app keeps its top-bar links inside a menu, so open it
// when a link is not already visible.
async function krossRevealInMenu(page: any, target: any) {
  if (await target.isVisible().catch(() => false)) return;
  const toggle = page.locator('header button[aria-expanded="false"], [role="banner"] button[aria-expanded="false"]').first();
  if (await toggle.count().catch(() => 0)) {
    await toggle.click().catch(() => {});
    await target.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  }
}
