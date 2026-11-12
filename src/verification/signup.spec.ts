import { test, expect } from "@playwright/test";

/**
 * Real-flow verification for the /signup form (Module 2, step 4).
 *
 * Two distinct flows:
 *   1. the phone field captures exactly what the person types (no reformatting
 *      that would drop digits), and
 *   2. creating an account through the real form signs the person in, which the
 *      shared header proves by showing "Sign out".
 *
 * The account store is the browser's own localStorage, so every address used
 * here is freshly generated and disposable, and the test signs out at the end.
 */

function disposableEmail(prefix: string): string {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return `e2e.${prefix}.${unique}@example.com`;
}

test.describe("signup — phone capture and account creation @affected", () => {
  test("typing a phone number keeps the entered value @affected", async ({ page }) => {
    await page.goto("/signup");

    // The form itself must render (no blank page / root error fallback).
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

    const phone = page.getByLabel("Phone number", { exact: true });
    await expect(phone).toBeVisible();

    // Perform the real action against the real input.
    await phone.fill("08012345678");

    // Assert the outcome: every typed digit is still there.
    await expect(phone).toHaveValue("08012345678");

    // And the value survives a focus round-trip (no on-blur reformatting).
    await page.getByLabel("Full name", { exact: true }).focus();
    await expect(phone).toHaveValue("08012345678");
  });

  test("creating an account shows the 'Sign out' button in the header @affected", async ({
    page,
  }) => {
    const email = disposableEmail("signup");

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

    await page.getByLabel("Full name", { exact: true }).fill("Chidi Okonkwo");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Phone number", { exact: true }).fill("08012345678");
    await page.getByLabel("Password", { exact: true }).fill("DisposablePass123");

    await page.getByRole("button", { name: "Create account", exact: true }).click();

    // Outcome 1: the shared header now reports a live session.
    const signOut = page.getByRole("button", { name: "Sign out", exact: true });
    await expect(signOut).toBeVisible({ timeout: 20000 });

    // Outcome 2: the person lands on the dashboard that explains the next step.
    await expect(page).toHaveURL(/\/dashboard$/);

    // Outcome 3: a full reload re-hydrates the session from the store.
    await page.reload();
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible({
      timeout: 20000,
    });

    // Clean up the disposable session so no signed-in state leaks to later tests.
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toHaveCount(0);
  });
});
