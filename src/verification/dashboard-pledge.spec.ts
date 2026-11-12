import { test, expect } from "@playwright/test";

test("pledges on a dashboard bill and updates the remaining amount", { tag: "@affected" }, async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("Bill title").fill("School fees balance");
  await page.getByLabel("Amount").fill("50000");
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/feed$/);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your pledges" })).toBeVisible();

  const billCard = page.getByTestId("dashboard-bill").filter({ hasText: "School fees balance" });
  await expect(billCard).toBeVisible();
  await expect(billCard.getByTestId("bill-remaining")).toHaveText("₦50,000");

  await billCard.getByLabel("Pledge amount").fill("15000");
  await billCard.getByRole("button", { name: "Pledge" }).click();

  await expect(billCard.getByTestId("bill-remaining")).toHaveText("₦35,000");
  await expect(billCard.getByText("₦15,000")).toBeVisible();

  await page.reload();

  const reloadedCard = page.getByTestId("dashboard-bill").filter({ hasText: "School fees balance" });
  await expect(reloadedCard.getByTestId("bill-remaining")).toHaveText("₦35,000");
});
