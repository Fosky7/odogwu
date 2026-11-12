import { test, expect } from "@playwright/test";

/**
 * Module 2 · the sign-in flow.
 *
 * This is the single saved specification for signing in, so it covers both
 * halves of what `/login` promises, in the order a real person would hit them:
 *
 *   1. a disposable account is created through the real sign-up UI, because the
 *      sign-in page checks the credentials that page stored (nothing
 *      pre-existing is read or mutated);
 *   2. signing out from the shared header returns the page to the signed-out
 *      state;
 *   3. submitting a WRONG password shows the one neutral message,
 *      "Email or password is incorrect", and no signed-in panel;
 *   4. submitting the RIGHT password swaps the form for the confirmation panel
 *      whose "Dashboard" link is visible and points at /dashboard;
 *   5. a full reload re-reads the persisted session, so the person stays signed
 *      in instead of being bounced back to the form.
 *
 * Everything is disposable and created inside the test; the account lives only
 * in this browser context's storage, which Playwright discards afterwards.
 */

const TEST_PASSWORD = "NaijaCrowd-E2E-2024";
const WRONG_PASSWORD = "definitely-not-the-password";

/** A fresh address for every run so repeated runs never collide. */
function disposableEmail(): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `e2e.login.${stamp}.${random}@example.com`;
}

test.describe("sign in flow @affected", () => {
  test("wrong credentials show the neutral error and real credentials show the Dashboard link @affected", async ({
    page,
  }) => {
    const email = disposableEmail();

    // 1. Create the disposable account through the sign-up UI, so the sign-in
    //    page has a genuine stored credential pair to check.
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();

    await page.getByTestId("signup-name").fill("Bola E2E");
    await page.getByTestId("signup-email").fill(email);
    await page.getByTestId("signup-phone").fill("08012345678");
    await page.getByTestId("signup-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-confirm-password").fill(TEST_PASSWORD);
    await page.getByTestId("signup-submit").click();
    await expect(page.getByTestId("signup-success")).toBeVisible();

    // 2. Sign out from the header so /login renders its form again. Scope the
    //    link assertion to the header: the sign-up page also contains a
    //    "Sign in" link in its footer paragraph.
    await page.getByRole("banner").getByRole("button", { name: /sign out/i }).click();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Sign in" }),
    ).toBeVisible();

    // 3. Wrong password → the single neutral error, no session.
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(WRONG_PASSWORD);
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("signin-error")).toHaveText(
      "Email or password is incorrect",
    );
    await expect(page.getByTestId("signin-success")).toHaveCount(0);
    await expect(page.getByTestId("signin-form")).toBeVisible();

    // 4. Correct password → signed-in confirmation with a real Dashboard link.
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(TEST_PASSWORD);
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("signin-success")).toBeVisible();
    await expect(page.getByTestId("signed-in-email")).toHaveText(email);

    const dashboardLink = page.getByTestId("signin-dashboard");
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    // The header reflects the same session.
    await expect(
      page.getByRole("banner").getByRole("button", { name: /sign out/i }),
    ).toBeVisible();

    // 5. Persistence: the session was stored, not just kept in memory.
    await page.reload();
    await expect(page.getByTestId("signin-success")).toBeVisible();
    await expect(page.getByTestId("signin-dashboard")).toBeVisible();
  });
});
