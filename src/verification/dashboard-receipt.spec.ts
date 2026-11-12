import { test, expect } from "@playwright/test";

test("@affected clicking View receipt on the dashboard opens the Payment receipt page", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "My pledges" })).toBeVisible();

  const viewReceipt = page.getByRole("link", { name: "View receipt" }).first();
  await expect(viewReceipt).toBeVisible();
  await viewReceipt.click();

  await expect(page).toHaveURL(/\/receipt\//);
  await expect(page.getByRole("heading", { name: "Payment receipt" })).toBeVisible();
});
