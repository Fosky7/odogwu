import { test, expect } from "@playwright/test";

test("@affected @auth wrong credentials on /login show the error message", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  await page
    .getByLabel(/^email$/i)
    .first()
    .fill(`wrong.${Date.now()}@example.com`);
  await page.getByLabel(/^password$/i).first().fill("WrongPassword123!");
  await page.getByRole("button", { name: /^sign in$/i }).first().click();

  await expect(page.getByText("Email or password is incorrect")).toBeVisible();
});

test("@affected @auth signing in with valid details shows the Dashboard link", async ({ page }) => {
  const email = `e2e.disposable.${Date.now()}@example.com`;
  const password = "KrossTest123!";

  await page.goto("/signup");
  await page.getByLabel(/full name/i).first().fill("E2E Disposable");
  await page.getByLabel(/^email$/i).first().fill(email);
  await page.getByLabel(/phone number/i).first().fill("08012345678");
  await page.getByLabel(/^password$/i).first().fill(password);
  await page.getByRole("button", { name: /create account/i }).first().click();
  await expect(page.getByRole("button", { name: /sign out/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /sign out/i }).first().click();

  await page.goto("/login");
  await page.getByLabel(/^email$/i).first().fill(email);
  await page.getByLabel(/^password$/i).first().fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).first().click();

  await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
});
