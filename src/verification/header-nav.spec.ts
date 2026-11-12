import { test, expect } from "@playwright/test";

test("header Feed link opens the deck with a Pledge button @affected", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Feed", exact: true }).click();

  await expect(page).toHaveURL(/\/feed/);
  await expect(page.getByRole("button", { name: /Pledge/i }).first()).toBeVisible();
});

test("checkout address opens directly with the Amount due summary @affected", async ({ page }) => {
  await page.goto("/checkout");

  await expect(page.getByText("Amount due", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay with Paystack", exact: true })).toBeVisible();
});
