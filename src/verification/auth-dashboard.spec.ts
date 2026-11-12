import { test, expect } from "@playwright/test";

test("@affected signing in with the runner account opens the dashboard", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  test.skip(
    !email || !password,
    "setup-required: E2E_USER_EMAIL and E2E_USER_PASSWORD must be supplied by the runner",
  );

  await page.goto("/login");

  await page
    .locator('input[type="email"], [data-testid="login-email"]')
    .first()
    .fill(email!);
  await page.getByTestId("login-password").fill(password!);
  await page.getByRole("button", { name: /sign in/i }).first().click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await krossRevealInMenu(page, page.getByTestId("header-signout"));
  await expect(page.getByTestId("header-signout")).toBeVisible();
  await expect(page.getByRole("heading", { name: /my pledges/i })).toBeVisible();
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
