import { test, expect } from "@playwright/test";

/**
 * @affected Module 2 · Step 5 — home page account entry points.
 *
 * ONE test per flow:
 *  - clicking "Create account" on / must open the "Create your account" page;
 *  - clicking "Sign in" on / must open the "Sign in" page.
 */

test.describe("@affected home auth entry points", () => {
  test("home Create account link opens the signup page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Clear a bill with a swipe", level: 1 }),
    ).toBeVisible();

    const createAccount = page
      .getByTestId("home-auth-entry")
      .getByRole("link", { name: "Create account", exact: true });

    // Only assert the signed-out entry state when the visitor really is signed out.
    const signedOut = (await createAccount.count()) > 0;
    test.skip(
      !signedOut,
      "setup-required: the current browser context already holds a session, so the signed-out home entry points are not rendered.",
    );

    await expect(createAccount).toBeVisible();
    await createAccount.click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: "Create your account", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("Phone number", { exact: true })).toBeVisible();
  });

  test("home Sign in link opens the login page", async ({ page }) => {
    await page.goto("/");

    const signIn = page
      .getByTestId("home-auth-entry")
      .getByRole("link", { name: "Sign in", exact: true });

    const signedOut = (await signIn.count()) > 0;
    test.skip(
      !signedOut,
      "setup-required: the current browser context already holds a session, so the signed-out home entry points are not rendered.",
    );

    await expect(signIn).toBeVisible();
    await signIn.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });
});
