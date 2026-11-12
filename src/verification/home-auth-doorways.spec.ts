import { test, expect } from "@playwright/test";

test("home page sign-in doorway opens the login page @affected", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Sign in" }).first().click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Welcome back")).toBeVisible();
});

test("home page create-account doorway opens the signup page @affected", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Create account" }).first().click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByText("Create your account")).toBeVisible();
});
