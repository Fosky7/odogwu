import { test, expect, type Page } from "@playwright/test";

/**
 * Flow: /login accepts valid details and lands the person in the app.
 *
 * Accounts and sessions for this app live in the browser, so the credentials
 * used here are created through the real /signup form first (a disposable,
 * run-scoped address) and signed out again before the login form is exercised.
 * Nothing pre-existing is touched.
 */

type SignUpFields = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

function disposableAccount(): SignUpFields {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    fullName: "Ada Obi",
    email: `e2e.login.valid.${unique}@example.com`,
    phone: "08012345678",
    password: `Disposable-${unique}!`,
  };
}

async function createAccountThroughUi(page: Page, account: SignUpFields): Promise<void> {
  await page.goto("/signup");

  await page.getByLabel("Full name", { exact: true }).fill(account.fullName);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Phone number", { exact: true }).fill(account.phone);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();

  // A successful sign-up writes a session, so the shared header shows the
  // signed-in controls.
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }).first(),
  ).toBeVisible({ timeout: 30000 });
}

async function signOutThroughUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0, { timeout: 20000 });
}

test.describe("login — valid credentials @affected", () => {
  test("signing in with valid details reveals the Dashboard link @affected", async ({ page }) => {
    const account = disposableAccount();

    // Prerequisite: the credentials must belong to a real account.
    await createAccountThroughUi(page, account);
    await signOutThroughUi(page);

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i, level: 1 })).toBeVisible();

    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // The signed-in header exposes the Dashboard link plus Sign out.
    const dashboardLink = page.getByRole("link", { name: "Dashboard", exact: true }).first();
    await expect(dashboardLink).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }).first(),
    ).toBeVisible();

    // The session survives a full reload.
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }).first(),
    ).toBeVisible({ timeout: 20000 });

    // Visiting /login while signed in shows the account card and its
    // Dashboard doorway instead of asking for credentials again.
    await page.goto("/login");
    await expect(page.getByText(/you are already signed in as/i)).toBeVisible();
    await expect(page.getByText(account.email).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Dashboard", exact: true }).first(),
    ).toBeVisible();

    // Clean up the session created through the real UI.
    await signOutThroughUi(page);
  });
});
