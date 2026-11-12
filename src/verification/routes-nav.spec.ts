import { test, expect } from "@playwright/test";

test.describe("@affected navigation", () => {
  test("home navigation opens the feed, create and dashboard pages", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Feed", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Feed", exact: true }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole("heading", { name: "Verified bills" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Create", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/create$/);
    await expect(page.getByRole("heading", { name: "Request a bill" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your pledges" })).toBeVisible();
  });
});
