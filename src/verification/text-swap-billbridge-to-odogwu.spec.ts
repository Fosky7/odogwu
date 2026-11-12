import { test, expect } from "@playwright/test";

// Written by KrossBuild for the request to replace "BillBridge" with "Odogwu".
// OLD_TEXT is the retired brand name the request asked to remove; NEW_TEXT is
// the brand every affected page must now show. The two constants MUST differ,
// otherwise the `not.toContain` assertion contradicts the `toContain`
// assertion and the flow can never pass.
const OLD_TEXT = "BillBridge";
const NEW_TEXT = "Odogwu";
const SHOWS_NEW_TEXT = ["/"];
const OLD_TEXT_GONE_FROM = ["/"];

if (OLD_TEXT === NEW_TEXT) {
  throw new Error(
    "text-swap spec is contradictory: OLD_TEXT and NEW_TEXT must be different strings.",
  );
}

test.describe("text change @affected", () => {
  for (const address of ["/"]) {
    test(`${address} shows the new wording @affected`, async ({ page }) => {
      await page.goto(address);
      const visible = async () => `${await page.title()}\n${await page.locator("body").innerText()}`;
      await expect
        .poll(async () => (await page.locator("body").innerText()).trim().length)
        .toBeGreaterThan(0);
      const onPage = new URL(page.url()).pathname === address;
      if (onPage && SHOWS_NEW_TEXT.includes(address)) {
        await expect.poll(visible).toContain(NEW_TEXT);
        // The brand is addressable in the shared header as well.
        await expect(
          page.getByRole("banner").getByRole("link", { name: NEW_TEXT, exact: true }),
        ).toBeVisible();
      }
      if (OLD_TEXT_GONE_FROM.includes(address)) {
        expect(await visible()).not.toContain(OLD_TEXT);
      }
    });
  }
});
