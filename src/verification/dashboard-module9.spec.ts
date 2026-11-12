import { test, expect } from "@playwright/test";

test("dashboard lists pledges and requests and opens the payment receipt @affected", async ({
  page,
}) => {
  await page.goto("/dashboard");

  // Deliverable 1: "My pledges" section with a pledge that links to its receipt.
  await expect(page.getByText(/my pledges/i).first()).toBeVisible();
  const receiptLink = page.getByRole("link", { name: /view receipt/i }).first();
  await expect(receiptLink).toBeVisible();

  // Deliverable 2 + 3: "My requests" section with verification status, a
  // funding progress bar and Raised/Remaining totals.
  await expect(page.getByText(/my requests/i).first()).toBeVisible();
  await expect(page.getByText(/pending verification/i).first()).toBeVisible();
  await expect(page.getByText(/raised/i).first()).toBeVisible();
  await expect(page.getByText(/remaining/i).first()).toBeVisible();
  await expect(
    page
      .locator('[role="progressbar"], progress, [data-testid*="progress"]')
      .first(),
  ).toBeVisible();

  // Deliverable 4: clicking "View receipt" reaches the payment receipt page.
  await receiptLink.click();
  await expect(page).toHaveURL(/\/receipt\//);
  await expect(page.getByText(/payment receipt/i).first()).toBeVisible();
});
