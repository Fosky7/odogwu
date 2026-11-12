import { test, expect } from "@playwright/test";

test(
  "creates an account with a Nigerian phone number and shows the signed-in header @affected",
  async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.signup.${stamp}@example.com`;

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    await page.getByTestId("signup-name").fill("Ada Obi");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-phone").fill("08012345678");
    await page.getByTestId("signup-password").fill("TestPassw0rd!");
    await page.getByTestId("signup-confirm-password").fill("TestPassw0rd!");

    await page.getByTestId("signup-submit").click();

    // The completed sign-up opens the signed-in welcome view for the account
    // that was just created, with the shared header offering sign out.
    await expect(
      page.getByRole("heading", { name: "Welcome, Ada Obi", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await krossRevealInMenu(page, page.getByTestId("header-signout"));
    await expect(page.getByTestId("header-signout")).toBeVisible();
  },
);

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
