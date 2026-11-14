import { test, expect } from "@playwright/test";

/**
 * Checkout is the page the Paystack ledger is fed from, so it is the flow this
 * step has to keep honest: the amount that will be sent to Paystack must be
 * validated in naira *before* any charge starts, the Paystack transaction
 * reference exists only after the server has initialized the charge, and the
 * page must never carry a server secret.
 *
 * The same test then performs the real action - tapping Pay - and asserts the
 * honest outcome: either the charge cannot be opened ("Could not start
 * payment") while the Pay button stays available for a retry and no reference
 * is printed, or a live Paystack popup opened, which needs controlled Paystack
 * test credentials to dismiss and is reported as pending setup rather than
 * faked.
 */
test("@affected checkout refuses an over-balance pledge before any charge starts", async ({ page }) => {
  await page.goto("/checkout");

  const amountInput = page.getByLabel("Amount", { exact: true });

  // A checkout link without a reachable verified bill must say so plainly
  // instead of showing an empty payment form.
  if ((await amountInput.count()) === 0) {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /could not find that bill/i,
    );
    return;
  }

  await expect(amountInput).toBeVisible();

  // Far above any remaining balance: the shared naira math must block the charge
  // and say why, so Paystack is never initialized with an impossible amount.
  await amountInput.fill("999999999");

  await expect(page.getByTestId("checkout-error")).toBeVisible();

  const payButton = page.getByRole("button", { name: /Pay with Paystack/i });
  await expect(payButton).toBeEnabled();
  await expect(page.getByTestId("checkout-success")).toHaveCount(0);

  // The quotable Paystack reference is issued by the server only once a charge
  // has been initialized, so nothing is printed next to it before that happens.
  await expect(page.getByTestId("checkout-reference")).toHaveCount(0);

  // The pay-verify hook reports a cancellation only after the donor actually
  // closes the Paystack popup. A validation block is not a cancelled charge, so
  // neither outcome message may appear before a payment attempt is made.
  await expect(page.getByText("Payment cancelled", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Payment failed", { exact: true })).toHaveCount(0);

  // Only the publishable key may ever reach the browser. The HMAC secret and the
  // service role key stay inside the edge functions.
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("sk_");
  expect(body).not.toContain("service_role");
  expect(body).not.toContain("PAYSTACK_SECRET_KEY");

  // ------------------------------------------------------------------------
  // A real attempt: correct the amount to the documented minimum, then tap Pay.
  // ------------------------------------------------------------------------
  await amountInput.fill("100");

  if ((await page.getByTestId("checkout-error").count()) > 0) {
    test.info().annotations.push({
      type: "setup-required",
      description:
        "The seeded bill cannot accept a \u20a6100 pledge (remaining balance below the minimum), so the Paystack start path cannot be exercised in this run.",
    });
    test.skip(
      true,
      "setup-required: a verified bill with at least \u20a6100 still owed is needed before Pay can be exercised.",
    );
  }

  await expect(payButton).toBeEnabled();
  await payButton.click();

  // The Paystack popup is rendered by Paystack in its own cross-origin iframe.
  // Either our own outcome panel appears, or that iframe does.
  const feedback = page.locator(
    '[data-testid="checkout-outcome"], iframe[src*="paystack"]',
  );
  await expect(feedback.first()).toBeVisible({ timeout: 25000 });

  if ((await page.locator('iframe[src*="paystack"]').count()) > 0) {
    test.info().annotations.push({
      type: "setup-required",
      description:
        "A controlled Paystack test key and card are needed to open and dismiss the popup, so the cancel/failure feedback cannot be exercised in this run.",
    });
    test.skip(
      true,
      "setup-required: the Paystack popup opened; cancelling it needs controlled Paystack test credentials.",
    );
  }

  // The charge could not be opened. The page must say so honestly, keep the Pay
  // button available for a retry, and still print no reference and no receipt.
  const outcome = page.getByTestId("checkout-outcome");
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText(/could not start payment/i);
  await expect(payButton).toBeEnabled();
  await expect(page.getByTestId("checkout-status")).toHaveText(/unpaid/i);
  await expect(page.getByTestId("checkout-reference")).toHaveCount(0);
  await expect(page.getByTestId("checkout-success")).toHaveCount(0);

  const afterAttempt = await page.locator("body").innerText();
  expect(afterAttempt).not.toContain("sk_");
  expect(afterAttempt).not.toContain("service_role");
  expect(afterAttempt).not.toContain("PAYSTACK_SECRET_KEY");
});
