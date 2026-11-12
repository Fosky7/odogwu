import { test, expect, type Page } from "@playwright/test";

/**
 * Module 2 — account sign-up flow (one test for this flow).
 *
 * This spec drives the REAL /signup page that the app actually renders: the
 * form's visible labels (Full name / Email / Phone number / Password), the
 * submit button, the shared header that swaps its visitor doorways for a
 * "Sign out" button once the session lands, the /dashboard landing page and
 * the persisted session after a full reload.
 *
 * Only a disposable account is created; the flow clears the browser's auth
 * storage before starting so no pre-existing data is touched, and it signs the
 * created session out again through the header UI.
 */

const AUTH_STORAGE_KEY = "odogwu.auth.v1";

function disposableAccount() {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    fullName: "Ada Obi",
    email: `e2e.signup.${unique}@example.com`,
    phone: "08012345678",
    password: `Disposable-${unique}!`,
  };
}

async function signOutThroughHeader(page: Page): Promise<void> {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in" }),
  ).toBeVisible({ timeout: 20000 });
}

test.describe("account sign-up @affected", () => {
  test("creates an account with a Nigerian phone number and shows the signed-in header @affected", async ({
    page,
  }) => {
    const account = disposableAccount();

    // Start from a genuinely signed-out browser (disposable test context only).
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, AUTH_STORAGE_KEY);

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

    // Typing the local Nigerian number is echoed back verbatim by the field.
    const phoneField = page.getByLabel("Phone number", { exact: true });
    await phoneField.fill(account.phone);
    await expect(phoneField).toHaveValue(account.phone);

    await page.getByLabel("Full name", { exact: true }).fill(account.fullName);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);

    // Filling the other fields must not disturb the captured phone number.
    await expect(phoneField).toHaveValue(account.phone);

    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // Acceptance: the account is created, the session is live, the shared header
    // shows the "Sign out" action and the visitor lands on the dashboard.
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: `Welcome, ${account.fullName}`, exact: true }),
    ).toBeVisible();

    // The account store persists the session across a full reload.
    await page.reload();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: `Welcome, ${account.fullName}`, exact: true }),
    ).toBeVisible();

    // Clean up the session created through the real UI.
    await signOutThroughHeader(page);
  });
});
