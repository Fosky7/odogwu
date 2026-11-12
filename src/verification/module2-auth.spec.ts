import { expect, test } from "@playwright/test";

/**
 * Module 2 · step 6 — the landing-page account doorways.
 *
 * The credential flows themselves live in their own focused specs, so each flow
 * is verified exactly once:
 *   - rejected sign-in            → src/verification/auth-login.spec.ts
 *   - accepted sign-in            → src/verification/module2-login.spec.ts
 *   - signup form + signup header → src/verification/module2-signup.spec.ts
 *
 * This file keeps only the home-page doorway navigation, which is what step 6
 * changes: pressing "Log in" on "/" must open the page rendering the "Sign in"
 * button, and "Create account" must open the page rendering the "Phone number"
 * field. Both are clicked through the real UI against the real router.
 */
test.describe("home page doorways @affected", () => {
  test("Log in opens the sign-in page and Create account opens the signup page @affected", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    // The hero doorways are scoped by their labelled navigation so the identical
    // doorway links the shared header and the closing section also render are
    // never matched by accident.
    const doorways = page.getByRole("navigation", { name: "Get started" });
    await expect(doorways).toBeVisible();

    // 1) "Log in" on / opens the page with the "Sign in" button.
    await doorways.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: /welcome back/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    // 2) "Create account" on / opens the page with the "Phone number" field.
    await page.goto("/");
    const homeDoorways = page.getByRole("navigation", { name: "Get started" });
    await expect(homeDoorways).toBeVisible();
    await homeDoorways.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/signup$/, { timeout: 20000 });
    await expect(
      page.getByRole("heading", { name: /create your account/i, level: 1 }),
    ).toBeVisible();

    // The signup destination really captures a phone number (the field accepts
    // input and keeps it), proving the doorway lands on the working form.
    const phoneField = page.getByLabel("Phone number", { exact: true });
    await expect(phoneField).toBeVisible();
    await phoneField.fill("08012345678");
    await expect(phoneField).toHaveValue("08012345678");
  });
});
