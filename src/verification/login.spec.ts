import { test, expect } from "@playwright/test";

test.describe("login @affected", () => {
  test("wrong credentials show the incorrect-credentials message @affected", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    await page.locator("#email").fill("not-a-real-account@example.com");
    await page.locator("#password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /^sign in$/i }).first().click();

    await expect(page.getByText("Email or password is incorrect")).toBeVisible();
    await expect(page.getByRole("heading", { name: /you.re signed in/i })).toHaveCount(0);
  });

  test("signing in with valid details shows the Dashboard link @affected", async ({ page }) => {
    const email = `e2e.login.${Date.now()}@example.com`;
    const password = "E2ePassw0rd!";

    // Create a disposable account through the real signup UI.
    await page.goto("/signup");
    await page.getByLabel(/name/i).first().fill("E2E Login Tester");
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/phone/i).first().fill("08012345678");

    const passwordFields = page.locator('input[type="password"]');
    const passwordCount = await passwordFields.count();
    for (let index = 0; index < passwordCount; index += 1) {
      await passwordFields.nth(index).fill(password);
    }

    await page.getByRole("button", { name: /create account|sign up/i }).first().click();

    const signOutButton = page.getByRole("button", { name: "Sign out" }).first();
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

    // Now sign in with the same credentials through the real login form.
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).first().click();

    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });
});
