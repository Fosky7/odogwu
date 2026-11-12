import { test, expect } from "@playwright/test";

test("creates a bill and shows it on the feed", { tag: "@affected" }, async ({ page }) => {
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "Request a bill" })).toBeVisible();

  await page.getByLabel("Bill title").fill("Lagos rent balance");
  await page.getByLabel("Amount").fill("25000");
  await page.getByLabel("Currency").selectOption("NGN");
  await page.getByLabel("Description (optional)").fill("Balance left on my rent for this year.");
  await page.getByRole("button", { name: "Create bill" }).click();

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole("heading", { name: "Verified bills" })).toBeVisible();
  const billCard = page.getByTestId("feed-bill").filter({ hasText: "Lagos rent balance" });
  await expect(billCard).toBeVisible();
  await expect(billCard.getByText("₦25,000")).toBeVisible();
  await expect(billCard.locator("time")).toBeVisible();
});

test("keeps created bills after a full reload", { tag: "@affected" }, async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("Bill title").fill("NEPA electricity bill");
  await page.getByLabel("Amount").fill("12000");
  await page.getByRole("button", { name: "Create bill" }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByText("NEPA electricity bill")).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Verified bills" })).toBeVisible();
  const billCard = page.getByTestId("feed-bill").filter({ hasText: "NEPA electricity bill" });
  await expect(billCard).toBeVisible();
  await expect(billCard.getByText("₦12,000")).toBeVisible();
});
