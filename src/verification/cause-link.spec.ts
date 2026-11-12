import { test, expect } from "@playwright/test";

test("@affected home page opens the cause detail from View bill details", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("link", { name: /view bill details/i }).first().click();

  await expect(page).toHaveURL(/\/cause\/1$/);
  await expect(
    page.getByRole("heading", { name: "Why this bill" })
  ).toBeVisible();

  await expect(page.getByText("Bill proof").first()).toBeVisible();
  await expect(page.getByText("Remaining").first()).toBeVisible();
  await expect(page.getByText("12 donors").first()).toBeVisible();
  await expect(page.getByText("Fully funded").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /pledge/i })).toHaveCount(0);
});
