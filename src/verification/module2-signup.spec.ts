import { test, expect, type Page } from "@playwright/test";

/**
 * Module 2 · step 4 — the /signup form, driven against the real rendered UI.
 *
 * Accounts and sessions for this app live in the browser, so the account used
 * here is disposable and generated per run. Nothing pre-existing is touched and
 * the session created through the form is signed out again through the header.
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
    email: `e2e.signup.${unique}@example.com`,
    phone: "08012345678",
    password: `Disposable-${unique}!`,
  };
}

async function signOutThroughUi(page: Page): Promise<void> {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Sign in" }),
  ).toBeVisible({ timeout: 20000 });
}

test.describe("signup form @affected", () => {
  /**
   * Module 2 · step 4 — the phone number field keeps exactly what was typed, and
   * submitting the completed form signs the new account in so the shared header
   * shows the "Sign out" button.
   */
  test("captures the phone number and signs the new account in @affected", async ({ page }) => {
    const account = disposableAccount();

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

    // The phone field must preserve the digits exactly as entered.
    const phoneField = page.getByLabel("Phone number", { exact: true });
    await phoneField.fill(account.phone);
    await expect(phoneField).toHaveValue(account.phone);

    await page.getByLabel("Full name", { exact: true }).fill(account.fullName);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);

    // Filling the other fields must not disturb the captured phone number.
    await expect(phoneField).toHaveValue(account.phone);

    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // A successful sign-up navigates into the app and the shared header swaps
    // the visitor doorways for the signed-in "Sign out" action.
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });

    // The session survives a full reload, proving the account was persisted.
    await page.reload();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible({ timeout: 20000 });

    // Clean up the session created through the real UI.
    await signOutThroughUi(page);
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toHaveCount(0);
  });
});
