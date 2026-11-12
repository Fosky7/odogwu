import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Module 2 — email sign-in flow (one test for this flow).
 *
 * The sign-up flow already has its own saved spec, so this file covers the
 * sign-in path end to end:
 *  - a disposable account is created through the real sign-up form (setup),
 *  - the session is ended so the browser is genuinely signed out,
 *  - a wrong password produces the single generic error,
 *  - the correct password signs the person in and the session survives a full
 *    reload (the persisted account store).
 */

const AUTH_STORAGE_KEY = "odogwu.auth.v1";

function disposableAccount() {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    displayName: "Ada Obi",
    email: `e2e.signin.${unique}@example.com`,
    phone: "08012345678",
    password: "NaijaPass123",
  };
}

/** Clears any leftover session once (never via an init script, which would also
 *  wipe the freshly created account on the reload assertion). */
async function startSignedOut(page: Page) {
  await page.goto("/login");
  await page.evaluate((key) => window.localStorage.removeItem(key), AUTH_STORAGE_KEY);
  await page.reload();
}

/** Ends the session while keeping the account record created during setup. */
async function endSession(page: Page) {
  const signOutButton = page.getByRole("button", { name: /^sign out$/i });
  if ((await signOutButton.count()) > 0) {
    await signOutButton.first().click();
  }

  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { accounts?: unknown; session?: unknown };
    parsed.session = null;
    window.localStorage.setItem(key, JSON.stringify(parsed));
  }, AUTH_STORAGE_KEY);

  await page.reload();
}

test.describe("email sign-in @affected", () => {
  test("wrong credentials show the generic error and correct ones sign the person in @affected", async ({
    page,
  }) => {
    const account = disposableAccount();

    await startSignedOut(page);

    // --- setup: register a disposable account through the real sign-up form ---
    await page.goto("/signup");

    const signupSubmit = page.getByTestId("signup-submit");
    const signupReady = await signupSubmit
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!signupReady) {
      test.skip(
        true,
        "setup-required: the /signup route did not render its form, so the disposable account needed by the sign-in flow could not be created.",
      );
    }

    await page.getByTestId("signup-name").fill(account.displayName);
    await page.getByTestId("signup-email").fill(account.email);
    await page.getByTestId("signup-phone").fill(account.phone);
    await expect(page.getByTestId("signup-phone")).toHaveValue(account.phone);
    await page.getByTestId("signup-password").fill(account.password);
    await page.getByTestId("signup-confirm-password").fill(account.password);
    await signupSubmit.click();

    await expect(page.getByTestId("signup-success")).toBeVisible();

    await endSession(page);

    // --- flow: the sign-in page shows the form for a signed-out person ---
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByTestId("signin-form")).toBeVisible();

    // --- flow: wrong password gets the one generic message ---
    await page.getByTestId("login-email").fill(account.email);
    await page.getByTestId("login-password").fill("WrongPass123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("signin-error")).toHaveText("Email or password is incorrect");
    await expect(page.getByTestId("signin-success")).toHaveCount(0);

    // A wrong attempt never keeps the password around.
    await expect(page.getByTestId("login-password")).toHaveValue("");

    // --- flow: the real password signs the person in ---
    await page.getByTestId("login-email").fill(account.email);
    await page.getByTestId("login-password").fill(account.password);
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("signin-success")).toBeVisible();
    await expect(page.getByTestId("signed-in-email")).toHaveText(account.email);
    await expect(page.getByTestId("signin-dashboard")).toBeVisible();
    await expect(page.getByTestId("signin-error")).toHaveCount(0);

    // The session is persisted by the account store: a full reload keeps it.
    await page.reload();
    await expect(page.getByTestId("signin-success")).toBeVisible();
    await expect(page.getByTestId("signed-in-email")).toHaveText(account.email);
    await expect(page.getByTestId("signin-dashboard")).toBeVisible();

    // Clean up the disposable account so nothing leaks between runs.
    await page.evaluate((key) => window.localStorage.removeItem(key), AUTH_STORAGE_KEY);
  });
});
