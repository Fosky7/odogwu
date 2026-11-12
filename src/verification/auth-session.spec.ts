import { test, expect } from "@playwright/test";

/**
 * Render check for Module 2: the /login page must mount inside the shared shell
 * (session provider + header) and expose the login form plus the documented
 * invalid-credential copy. The rejected-attempt and valid-sign-in flows are
 * covered once each in src/verification/auth-login.spec.ts — this file only
 * asserts the page renders, so no flow is duplicated.
 */

test.describe("login page render @affected", () => {
  test("the /login form renders inside the shared shell @affected", async ({ page }) => {
    await page.goto("/login");

    // If AuthProvider / AppShell failed to mount, the root error fallback shows
    // "Something went wrong" instead of the login form.
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: /welcome back/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    // The documented failure copy is stated on the page itself.
    await expect(
      page.getByText("Email or password is incorrect", { exact: false }).first(),
    ).toBeVisible();

    // The Dashboard doorway is reachable from this page.
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
  });
});
