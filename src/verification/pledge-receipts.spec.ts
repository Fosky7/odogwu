import { test, expect } from "@playwright/test";

/**
 * The receipt page is where a pledge turns into proof of payment, so the flow
 * this step has to keep honest is /receipt/:id: a reference that the server has
 * not confirmed must say "Payment pending" (never "Paid"), must echo the exact
 * reference the donor followed, and must re-read the same state after a reload.
 */
test("@affected receipt page shows Payment pending for an unverified reference and keeps it after reload", async ({ page }) => {
  const reference = `e2e-disposable-${Date.now()}-receipt`;

  await page.goto(`/receipt/${reference}`);

  // The receipt route is a real page with both escapes back into the app.
  await expect(page).toHaveTitle(/receipt/i);
  await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /back to cause/i })).toBeVisible();

  // An unverified reference must never be presented as settled.
  const status = page.getByTestId("receipt-status");
  await expect(status).toHaveText(/payment pending/i);
  await expect(page.getByTestId("receipt-paid-details")).toHaveCount(0);
  await expect(page.getByText("Paid", { exact: true })).toHaveCount(0);

  // The reference the donor followed is echoed so it can be checked with Paystack.
  await expect(page.getByTestId("receipt-reference")).toHaveText(reference);

  // No amount is invented for a reference the server has never seen.
  await expect(page.getByTestId("receipt-amount")).toHaveText(/^\u2014$/);

  // Reloading must re-read the same unverified state, not a cached "Paid".
  await page.reload();

  await expect(page.getByTestId("receipt-status")).toHaveText(/payment pending/i);
  await expect(page.getByTestId("receipt-reference")).toHaveText(reference);
  await expect(page.getByTestId("receipt-paid-details")).toHaveCount(0);

  // Only the publishable key may ever reach the browser, and the service role
  // must never be referenced from client code.
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("sk_");
  expect(body).not.toContain("service_role");
  expect(body).not.toContain("PAYSTACK_SECRET_KEY");
});
