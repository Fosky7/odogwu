import { test, expect } from "@playwright/test";

/**
 * Module 2, step 5 — the /login form.
 *
 * Two flows, one test each, driven through the real UI against the
 * browser-persisted account store this project ships with:
 *   1. wrong credentials -> the alert reads "Email or password is incorrect"
 *   2. valid credentials -> the "Dashboard" link becomes visible
 *
 * The account used for the valid sign-in is disposable and is created for this
 * run only through the real sign-up form; nothing pre-existing is read or
 * modified.
 */

type DisposableAccount = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

function makeAccount(): DisposableAccount {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    fullName: "E2E Login Tester",
    email: `e2e.login.${unique}@example.com`,
    phone: "08012345678",
    password: `Passw0rd-${unique}`,
  };
}

test.describe("login @affected", () => {
  test("wrong credentials show 'Email or password is incorrect' @affected", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i, level: 1 })).toBeVisible();

    // Perform the real action through the real form with an unregistered email.
    await page.getByLabel("Email", { exact: true }).fill(`nobody.${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("DefinitelyWrong-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Outcome: the single safe, non-revealing error copy.
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 20000 });
    await expect(alert).toHaveText("Email or password is incorrect");

    // No session was created: still on /login and the header keeps its doorways.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
  });

  test("valid credentials reveal the Dashboard link @affected", async ({ page }) => {
    const account = makeAccount();

    // Precondition: create the disposable account through the real sign-up form.
    await page.goto("/signup");
    const createButton = page.getByRole("button", { name: /create account/i }).first();

    if (!(await createButton.isVisible().catch(() => false))) {
      test
        .info()
        .annotations.push({
          type: "setup-required",
          description:
            "The /signup form is unavailable, so a disposable account cannot be created for the valid sign-in flow.",
        });
      test.skip();
    }

    await page.getByLabel(/full name/i).first().fill(account.fullName);
    await page.getByLabel(/^e-?mail/i).first().fill(account.email);
    await page.getByLabel(/phone/i).first().fill(account.phone);
    await page.getByLabel(/^password/i).first().fill(account.password);
    await createButton.click();

    // The account is created and signed in: the header swaps its doorways.
    const signOut = page.getByRole("button", { name: "Sign out", exact: true });
    await expect(signOut.first()).toBeVisible({ timeout: 20000 });

    // End that session so the next step is a genuine sign-in.
    await signOut.first().click();
    await page.goto("/login");

    // Perform the real sign-in with the disposable credentials.
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Outcome: the signed-in header and the Dashboard link are visible.
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole("button", { name: "Sign out", exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Leave no live session behind on this disposable account.
    await page.getByRole("button", { name: "Sign out", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
  });
});
