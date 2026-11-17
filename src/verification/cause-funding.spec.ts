import { test, expect } from "@playwright/test";

/**
 * The bill page is where funded progress is shown, so the flow this step has to
 * keep honest is /cause/:id: the Raised total reflects only payments the server
 * confirmed, and starting a pledge (or abandoning checkout) must not move it.
 *
 * The money itself is confirmed by Paystack + the verify/webhook functions, so
 * this spec performs the real, disposable actions the page owns: open the pledge
 * sheet, hand an amount to checkout, abandon the payment, then reread the bill
 * and assert the funded total is unchanged - including after a full reload.
 */
test("@affected cause page only raises the funded total for confirmed payments", async ({
  page,
}) => {
  await page.goto("/cause/1");

  // 1. The bill page renders its funding landmarks.
  await expect(page.getByTestId("cause-title")).toBeVisible();

  const raised = page.getByTestId("cause-raised");
  await expect(raised).toBeVisible();

  const initialRaised = (await raised.innerText()).trim();
  expect(initialRaised).toMatch(/^\u20a6[\d,]+$/);

  // The page states the rule the total follows, and counts confirmations.
  await expect(page.getByTestId("cause-funded-note")).toContainText(/confirm/i);
  await expect(page.getByTestId("cause-confirmed-count")).toHaveText(/^\d+$/);

  // 2. Start a pledge but never pay for it: an unconfirmed payment must leave
  //    the funded total untouched.
  const pledgeTrigger = page
    .getByRole("button", { name: "Pledge", exact: true })
    .first();
  await expect(pledgeTrigger).toBeVisible();
  await pledgeTrigger.click();

  const amount = page.getByLabel("Amount", { exact: true });
  await expect(amount).toBeVisible();

  // Use the sheet's own suggestion so the amount is always within the balance.
  const suggested = ((await amount.getAttribute("placeholder")) ?? "").replace(
    /[^0-9]/g,
    "",
  );
  await amount.fill(suggested || "500");

  const continueButton = page.getByRole("button", { name: /continue to payment/i });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // 3. Checkout is reached, and nothing has been confirmed yet.
  await expect(page).toHaveURL(/\/checkout\b/);
  await expect(page.getByTestId("checkout-success")).toHaveCount(0);
  await expect(page.getByTestId("checkout-status")).toHaveText(/unpaid/i);

  // 4. Abandon the payment and reread the bill: the Raised total is unchanged
  //    because no charge was ever confirmed.
  await page.goto("/cause/1");
  await expect(page.getByTestId("cause-raised")).toHaveText(initialRaised);

  // 5. A full reload re-reads the same confirmed total (persisted state, not a
  //    value captured at first render).
  await page.reload();
  await expect(page.getByTestId("cause-title")).toBeVisible();
  await expect(page.getByTestId("cause-raised")).toHaveText(initialRaised);

  // Only the publishable key may ever reach the browser.
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("sk_");
  expect(body).not.toContain("service_role");
  expect(body).not.toContain("PAYSTACK_SECRET_KEY");
});
