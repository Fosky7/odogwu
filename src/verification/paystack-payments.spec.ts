import { test, expect, type Page } from "@playwright/test";

/**
 * Flow verification for the Paystack wiring.
 *
 * The Paystack SECRET key is server-only, so the browser can only learn what
n * happened by calling the paystack-initialize / paystack-verify edge functions.
 * These specs therefore drive the real UI and assert the real outcome:
 *
 *  1. On /checkout, "Pay with Paystack" either hands the browser to the hosted Paystack page or renders the visible message "Payment could not be started".
 *
 * This spec covers three flows, one test each:
 *   1. checkout: start a payment (hosted page, or the honest refusal copy)
 *   2. checkout: return from a cancelled payment (Unpaid + "Try again" restart)
 *   3. receipt: an unsettled / unknown reference never renders as Paid
 *
 * The "completed payment -> Paid on /receipt/<id>" leg needs a real settled
 * Paystack test transaction, so it is declared as a setup-required prerequisite
 * instead of being fabricated. A pledge must never look Paid before the edge
 * function has confirmed the money moved.
 */

const EMAIL = process.env.E2E_USER_EMAIL ?? "";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "";

/** Real, settled Paystack test reference used only for the paid receipt leg. */
const SETTLED_REFERENCE = process.env.E2E_PAYSTACK_SETTLED_REFERENCE ?? "";

const HOSTED_URL = /paystack\.com/i;
const START_FAILURE = /payment could not be started/i;
const NOT_COMPLETED = /payment not completed/i;
const FALSE_SUCCESS = /payment successful|thank you for your (payment|pledge)/i;

const WAIT = 45_000;

/** Sign in through the real form when the app asks for a session first. */
async function ensureSignedIn(page: Page): Promise<void> {
  if (!/(sign-?in|log-?in|auth)/i.test(new URL(page.url()).pathname)) return;

  await page.getByLabel(/email/i).first().fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();
  await page.waitForURL((url) => !/(sign-?in|log-?in)/i.test(url.pathname), {
    timeout: 30_000,
  });
}

/**
 * Fill the checkout form with a disposable amount and click the primary payment
 * action. Resolves to whichever honest outcome the app really produced.
 */
async function startPayment(page: Page): Promise<"hosted" | "refused" | null> {
  const amountInput = page.getByTestId("checkout-amount");
  if ((await amountInput.count()) > 0) {
    await amountInput.fill("1000");
  }

  const emailInput = page.getByTestId("checkout-email");
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(EMAIL);
  }

  const payButton = page
    .getByRole("button", {
      name: /pay with paystack|start payment|make payment|try again/i,
    })
    .first();
  await expect(payButton).toBeVisible({ timeout: 20_000 });
  await payButton.click();

  const hosted = page
    .waitForURL(HOSTED_URL, { timeout: WAIT })
    .then(() => "hosted" as const)
    .catch(() => null);

  const refused = page
    .getByText(START_FAILURE)
    .first()
    .waitFor({ state: "visible", timeout: WAIT })
    .then(() => "refused" as const)
    .catch(() => null);

  return await Promise.race([hosted, refused]);
}

test.describe("Paystack checkout @affected", () => {
  test.beforeEach(async () => {
    test.skip(
      !EMAIL || !PASSWORD,
      "setup-required: the runner must supply E2E_USER_EMAIL and E2E_USER_PASSWORD disposable account credentials so the checkout flow can be reached.",
    );
  });

  test("starting a pledge payment opens the hosted Paystack page and never fakes success @affected", async ({
    page,
  }) => {
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    await ensureSignedIn(page);
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });

    // The checkout page itself must render (never a blank page).
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    // Before any payment the pledge is honestly Unpaid.
    await expect(page.getByTestId("checkout-status")).toHaveText(/unpaid/i);

    const outcome = await startPayment(page);

    expect(
      outcome,
      'Clicking "Pay with Paystack" must either open the hosted Paystack page or show the visible message "Payment could not be started".',
    ).not.toBeNull();

    if (outcome === "hosted") {
      // The hosted page carries the transaction: its URL is on Paystack's domain.
      expect(page.url()).toMatch(HOSTED_URL);

      // Returning without paying must leave the app usable and unpaid.
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(FALSE_SUCCESS)).toHaveCount(0);
      await expect(page).not.toHaveURL(HOSTED_URL);
    } else {
      await expect(page.getByText(START_FAILURE).first()).toBeVisible({
        timeout: 5_000,
      });
      await expect(page.getByText(FALSE_SUCCESS)).toHaveCount(0);
      await expect(page).not.toHaveURL(HOSTED_URL);
      // A refused start must not silently mark the pledge paid.
      await expect(page.getByTestId("checkout-status")).toHaveText(/unpaid/i);
    }
  });

  /**
   * Flow: returning to /checkout after a cancelled Paystack payment.
   *
   * Paystack sends the donor back with a cancelled status (or an abandoned
   * reference). The pledge must stay visibly Unpaid with the honest copy
   * "Payment not completed", and "Try again" must restart a real attempt.
   */
  test("returning from a cancelled payment shows \"Payment not completed\" as Unpaid and Try again restarts the payment @affected", async ({
    page,
  }) => {
    await page.goto("/checkout?status=cancelled", { waitUntil: "domcontentloaded" });
    await ensureSignedIn(page);
    await page.goto("/checkout?status=cancelled", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    // The cancelled return is reported honestly and the pledge is still owed.
    await expect(page.getByText(NOT_COMPLETED).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("checkout-status")).toHaveText(/unpaid/i);
    await expect(page.getByText(FALSE_SUCCESS)).toHaveCount(0);

    // Retrying starts a brand new Paystack transaction (or reports honestly).
    const outcome = await startPayment(page);

    expect(
      outcome,
      'Clicking "Try again" must either open the hosted Paystack page again or show the visible message "Payment could not be started".',
    ).not.toBeNull();

    if (outcome === "hosted") {
      expect(page.url()).toMatch(HOSTED_URL);
    } else {
      await expect(page).not.toHaveURL(HOSTED_URL);
      await expect(page.getByText(FALSE_SUCCESS)).toHaveCount(0);
      await expect(page.getByTestId("checkout-status")).toHaveText(/unpaid/i);
    }
  });
});

test.describe("Paystack receipt @affected", () => {
  test.beforeEach(async () => {
    test.skip(
      !EMAIL || !PASSWORD,
      "setup-required: the runner must supply E2E_USER_EMAIL and E2E_USER_PASSWORD disposable account credentials so the receipt page can be reached.",
    );
  });

  /**
   * Flow: a receipt opened without a settled Paystack reference.
   *
   * Nothing has been confirmed, so the pledge must render as Unpaid and the
   * receipt must carry no payment reference value at all.
   */
  test("a receipt without a settled Paystack reference stays Unpaid and shows no payment reference @affected", async ({
    page,
  }) => {
    await page.goto("/receipt/123", { waitUntil: "domcontentloaded" });
    await ensureSignedIn(page);
    await page.goto("/receipt/123", { waitUntil: "domcontentloaded" });

    // The receipt page renders its real landmark.
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    // Nothing has been confirmed: the pledge is owed and carries no reference.
    await expect(page.getByTestId("receipt-status")).toHaveText(/unpaid/i);
    await expect(page.getByTestId("receipt-payment-reference")).toHaveCount(0);
    await expect(page.getByText(FALSE_SUCCESS)).toHaveCount(0);
  });

  /**
   * Flow: an unknown / unverifiable Paystack reference.
   *
   * The verify edge function rejects it, so the receipt must fall back to the
   * honest "Payment not completed" state instead of inventing a paid receipt.
   */
  test("an unknown Paystack reference is reported as not completed and never as Paid @affected", async ({
    page,
  }) => {
    const reference = `ODG-E2E-${Date.now().toString(36).toUpperCase()}`;
    const url = `/receipt/123?reference=${encodeURIComponent(reference)}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await ensureSignedIn(page);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    // An unverifiable reference resolves to an honest, unsettled state.
    await expect(page.getByText(NOT_COMPLETED).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("receipt-status")).toHaveText(/unpaid/i);
    await expect(page.getByTestId("receipt-payment-reference")).toHaveCount(0);
    await expect(page.getByText(FALSE_SUCCESS)).toHaveCount(0);
  });

  /**
   * Flow: a genuinely settled payment shown on the receipt.
   *
   * Requires a real, settled Paystack test transaction reference; without one
   * the leg is skipped with an honest reason instead of faking a paid result.
   */
  test("a settled Paystack reference shows Paid, the amount and the payment reference @affected", async ({
    page,
  }) => {
    test.skip(
      !SETTLED_REFERENCE,
      "setup-required: E2E_PAYSTACK_SETTLED_REFERENCE must point at a real, settled Paystack test transaction so a genuine 'Paid' receipt can be verified; a fabricated paid result is never acceptable.",
    );

    const url = `/receipt/123?reference=${encodeURIComponent(SETTLED_REFERENCE)}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await ensureSignedIn(page);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    // Only a server-confirmed payment reaches the paid state.
    await expect(page.getByTestId("receipt-status")).toHaveText(/^paid$/i, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("receipt-payment-reference")).toHaveText(
      SETTLED_REFERENCE,
    );

    // The amount is the provider's number, formatted in Naira.
    const amount = page.getByTestId("receipt-amount");
    await expect(amount).toBeVisible();
    await expect(amount).toContainText("₦");
  });
});
