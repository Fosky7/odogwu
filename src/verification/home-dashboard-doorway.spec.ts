import { test, expect, type Page } from "@playwright/test";

/**
 * Flow: the Dashboard doorway on the home page.
 *
 * On "/" a signed-in person clicks the "Dashboard" link in the hero and lands
 * on /dashboard, which renders the "My pledges" (and "My requests") sections.
 *
 * The session comes from the runner-supplied disposable account, signed in
 * through the real /login form. When those credentials are absent a disposable
 * account is created through the real /signup form instead. Only disposable
 * data is used — nothing pre-existing is touched.
 */

/** Sign in with the runner-supplied disposable account via the real form. */
async function signInWithRunnerAccount(page: Page): Promise<boolean> {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) return false;

  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
  return true;
}

/** Create a disposable account through the real /signup form. */
async function signUpDisposableAccount(page: Page): Promise<void> {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;

  await page.goto("/signup");
  const fullName = page.getByLabel("Full name", { exact: true });
  if ((await fullName.count()) === 0) {
    test.skip(
      true,
      "setup-required: the runner supplied no E2E_USER_EMAIL/E2E_USER_PASSWORD and the /signup form did not render, so no disposable signed-in session can be created for the dashboard doorway flow.",
    );
    return;
  }

  await fullName.fill("Ada Obi");
  await page.getByLabel("Email", { exact: true }).fill(`e2e.doorway.${unique}@example.com`);
  await page.getByLabel("Phone number", { exact: true }).fill("08012345678");
  await page.getByLabel("Password", { exact: true }).fill(`Disposable-${unique}!`);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
}

test.describe("home dashboard doorway @affected", () => {
  test("clicking Dashboard on / opens the dashboard showing My pledges @affected", async ({
    page,
  }) => {
    const signedIn = await signInWithRunnerAccount(page);
    if (!signedIn) await signUpDisposableAccount(page);

    // Start from the real home page and use its doorway link.
    await page.goto("/");
    const doorway = page.getByTestId("home-dashboard-link");
    await expect(doorway).toBeVisible();
    await expect(doorway).toHaveText("Dashboard");
    await expect(doorway).toHaveAttribute("href", /\/dashboard$/);

    await doorway.click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "My pledges", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("heading", { name: "My requests", exact: true })).toBeVisible();
  });
});
