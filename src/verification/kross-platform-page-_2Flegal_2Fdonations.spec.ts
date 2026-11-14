// KROSS_PLATFORM_PAGE_CONTRACT v1
import { test, expect } from '@playwright/test';
test("page /legal/donations refresh and navigation @affected", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto("/legal/donations");
  await expect(page.locator('body')).not.toBeEmpty();
  const destination = page.url();
  const title = await page.title();
  const heading = await page.getByRole('heading', {level:1}).allTextContents();
  const links = await page.getByRole('navigation').getByRole('link').evaluateAll(els => els.filter(e=>e instanceof HTMLAnchorElement).map(e=>({href:(e as HTMLAnchorElement).getAttribute('href'),text:e.textContent?.trim()})));
  for (const target of links) {
    if (!target.href?.startsWith('/') || target.href.startsWith('//')) continue;
    // Compare control-driven content to its canonical URL, not just URL movement.
    const canonical = await page.context().newPage();
    await canonical.goto(target.href);
    const expectedUrl = canonical.url();
    const expected = await canonical.getByRole('heading',{level:1}).allTextContents();
    await canonical.close();
    const link = page.getByRole('navigation').getByRole('link',{name:target.text || '',exact:true}).filter({visible:true});
    if (await link.count() !== 1) continue;
    await krossRevealInMenu(page, link);
    await link.click();
    await expect(page).toHaveURL(expectedUrl);
    expect(await page.getByRole('heading',{level:1}).allTextContents()).toEqual(expected);
    await page.goto(destination);
  }
  await page.goto('/');
  await page.goBack();
  await expect(page).toHaveURL(destination);
  expect(await page.getByRole('heading',{level:1}).allTextContents()).toEqual(heading);
  await page.goForward();
  await expect(page).toHaveURL(new URL('/',destination).href);
  await page.goBack();
  await page.reload();
  await expect(page).toHaveURL(destination);
  await expect(page).toHaveTitle(title);
  await expect(page.locator('body')).not.toBeEmpty();
  expect(await page.getByRole('heading',{level:1}).allTextContents()).toEqual(heading);
  expect(errors).toEqual([]);
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
