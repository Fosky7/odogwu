import { test, expect } from "@playwright/test";

test.describe("@affected home page entry points", () => {
  test("home page Create account opens the signup page", async ({ page }) => {
    await page.goto("/");

    const createAccount = page.getByRole("link", { name: "Create account" }).first();
    await expect(createAccount).toBeVisible();

    await createAccount.click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  });

  test("home page Sign in opens the login page", async ({ page }) => {
    await page.goto("/");

    const signIn = page.getByRole("link", { name: "Sign in" }).first();
    await expect(signIn).toBeVisible();

    await signIn.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("home page links to the verified bill feed", async ({ page }) => {
    await page.goto("/");

    const feedLink = page.getByRole("link", { name: /browse verified bills/i }).first();
    await expect(feedLink).toBeVisible();

    await feedLink.click();

    await expect(page).toHaveURL(/\/feed$/);
  });
});
