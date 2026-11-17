import { test, expect } from "@playwright/test";

/**
 * The pledge sheet is the only place the donor says *how much* they want to
 * give before real money is involved, so the flow this step has to keep honest
 * is bill page -> pledge sheet -> checkout: the sheet must open with an Amount
 * field, and the amount that was typed must arrive on /checkout tied to the same
 * bill (otherwise the donor would be charged a different figure than the one
 * they chose).
 */
test("@affected pledge sheet carries the chosen amount into checkout", async ({ page }) => {
  await page.goto("/cause/1");

  // 1. The bill page offers an entry point into pledging.
  const pledgeTrigger = page.getByRole("button", { name: /^pledge/i }).first();
  await expect(pledgeTrigger).toBeVisible();

  await pledgeTrigger.click();

  // 2. The sheet opens with a labelled Amount field.
  const amountInput = page.getByLabel("Amount", { exact: true });
  await expect(amountInput).toBeVisible();

  // 3. An amount is typed and handed over with "Continue to payment".
  await amountInput.fill("2500");

  const continueButton = page.getByRole("button", { name: /continue to payment/i });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // 4. Checkout is reached for the same bill, carrying the same amount.
  await expect(page).toHaveURL(/\/checkout\b/);

  const url = new URL(page.url());
  expect(url.pathname).toBe("/checkout");
  // The hand-off keeps the bill id the donor was reading, so the same bill is
  // priced on checkout (and /cause/1 keeps the quotable "1" reference).
  const carriedCause = url.searchParams.get("cause") ?? "";
  expect(["1", "bill-adaeze-hospital"]).toContain(carriedCause);

  const carriedParam = (url.searchParams.get("amount") ?? "").replace(/[^0-9.]/g, "");
  expect(Number(carriedParam)).toBe(2500);

  // 5. The checkout form opens on exactly that amount, not the whole balance.
  const checkoutAmount = page.getByLabel("Amount", { exact: true });
  await expect(checkoutAmount).toBeVisible();

  const checkoutValue = (await checkoutAmount.inputValue()).replace(/[^0-9.]/g, "");
  expect(Number(checkoutValue)).toBe(2500);

  // The charge itself only counts once it clears, and no server secret may reach
  // the browser on the way there.
  await expect(page.getByTestId("checkout-success")).toHaveCount(0);

  const body = await page.locator("body").innerText();
  expect(body).not.toContain("sk_");
  expect(body).not.toContain("service_role");
  expect(body).not.toContain("PAYSTACK_SECRET_KEY");
});
