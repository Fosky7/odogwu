import { test, expect } from "@playwright/test";

/**
 * Module 2 — email accounts.
 *
 * One test per flow:
 *  1. sign-up creates a disposable account and the header flips to the
 *     signed-in state ("Sign out" button + "Dashboard" link).
 *  2. sign-in rejects a wrong password with the generic credential error and
 *     then signs the same disposable account in, showing the Dashboard link.
 *
 * Accounts are provisioned through the real sign-up UI so the run never needs
 * pre-existing credentials, and every account uses a unique disposable email
 * that is signed out again at the end of the test.
 */

const DISPOSABLE_PASSWORD = "Odogwu#2024";

function disposableEmail(prefix: string): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 8);
  return `e2e.${prefix}.${stamp}.${noise}@example.com`;
}

test.describe("email accounts @affected", () => {
  test("sign-up creates an account and the header shows Sign out and Dashboard", async ({
    page,
  }) => {
    const email = disposableEmail("signup");

    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: "Create your account", level: 1 }),
    ).toBeVisible();

    await page.getByTestId("signup-name").fill("Ada Obi");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-phone").fill("08012345678");

    // Typing the phone number must echo it back to the visitor.
    await expect(page.getByTestId("signup-phone-preview")).toContainText("08012345678");

    await page.getByTestId("signup-password").fill(DISPOSABLE_PASSWORD);
    await page.getByTestId("signup-submit").click();

    // Inline confirmation names the account that was just created.
    await expect(page.getByTestId("signup-status")).toContainText(email);

    // The shared header is now in its signed-in state.
    const header = page.getByRole("banner");
    await krossRevealInMenu(page, header.getByRole("button", { name: "Sign out", exact: true }));
    await expect(header.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    await krossRevealInMenu(page, header.getByRole("link", { name: "Dashboard" }));
    await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("sign-in rejects a wrong password then signs the account in with a Dashboard link", async ({
    page,
  }) => {
    const email = disposableEmail("signin");

    // --- setup: create the disposable account through the real sign-up UI ---
    await page.goto("/signup");
    await page.getByTestId("signup-name").fill("Chidi Eze");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-phone").fill("08087654321");
    await page.getByTestId("signup-password").fill(DISPOSABLE_PASSWORD);
    await page.getByTestId("signup-submit").click();
    await expect(page.getByTestId("signup-status")).toContainText(email);

    const header = page.getByRole("banner");
    await header.getByRole("button", { name: "Sign out", exact: true }).click();
    await krossRevealInMenu(page, header.getByRole("link", { name: "Sign in" }));
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();

    // --- flow: the login page renders its sign-in form ---
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back", level: 1 })).toBeVisible();

    const signInForm = page.locator('form[aria-label="Sign in"]');
    await expect(signInForm).toBeVisible();

    // --- flow: wrong credentials are rejected with the generic message ---
    await signInForm.getByLabel("Email").fill(email);
    await signInForm.getByLabel("Password").fill("definitely-the-wrong-password");
    await signInForm.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByTestId("signin-error")).toHaveText(
      "Email or password is incorrect",
    );
    await expect(page.getByTestId("signin-success")).toHaveCount(0);
    // The email is kept so only the password needs correcting.
    await expect(signInForm.getByLabel("Email")).toHaveValue(email);
    await expect(signInForm.getByLabel("Password")).toHaveValue("");

    // --- flow: the right password signs the account in ---
    await signInForm.getByLabel("Password").fill(DISPOSABLE_PASSWORD);
    await signInForm.getByRole("button", { name: "Sign in", exact: true }).click();

    const success = page.getByTestId("signin-success");
    await expect(success).toBeVisible();
    await expect(page.getByTestId("signed-in-email")).toHaveText(email);
    await expect(success.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await krossRevealInMenu(page, header.getByRole("link", { name: "Dashboard" }));
    await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();

    // Leave the browser context signed out so nothing leaks into later runs.
    await header.getByRole("button", { name: "Sign out", exact: true }).click();
    await krossRevealInMenu(page, header.getByRole("link", { name: "Sign in" }));
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  });
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
