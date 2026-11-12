import { test, expect, type Page } from "@playwright/test";

/**
 * Module 7 — bill request creation with proof upload.
 *
 * One test per flow, driven through the real /create page:
 *   1. a signed-out visitor sees the "Sign in to create a request" notice
 *      while the form itself is still rendered so its validation is reachable
 *   2. submitting without a proof asks for the bill proof
 *   3. the Amount owed field previews Naira
 *   4. a complete request (with proof) is submitted and lands on
 *      "Pending verification" for a signed-in account.
 *
 * The session for flow 4 is a real browser session created through the app's
 * own /signup form; only disposable data is used and it is signed out again.
 */

function disposableAccount() {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    fullName: "Ada Obi",
    email: `e2e.create.${unique}@example.com`,
    phone: "08012345678",
    password: `Disposable-${unique}!`,
  };
}

async function signUpThroughUi(page: Page): Promise<void> {
  const account = disposableAccount();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).fill(account.fullName);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Phone number", { exact: true }).fill(account.phone);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();

  await expect(
    page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible({ timeout: 30000 });
}

test.describe("create request page @affected", () => {
  test("signed-out visitor sees the sign-in gate @affected", async ({ page }) => {
    await page.goto("/create");

    await expect(page.getByText("Sign in to create a request")).toBeVisible();
  });

  test("submitting without proof asks for the bill proof @affected", async ({ page }) => {
    await page.goto("/create");

    // The gate only blocks submission for visitors; the form itself is
    // rendered and must validate the proof.
    const titleField = page.getByLabel("Bill title");
    await expect(titleField).toBeVisible();

    await titleField.fill("Lagos General Hospital — malaria treatment");
    await page.getByLabel("Amount owed").fill("25000");
    await page.getByRole("button", { name: "Submit for verification" }).click();

    await expect(page.getByText("Please upload your bill proof")).toBeVisible();
  });

  test("amount owed shows the Naira preview @affected", async ({ page }) => {
    await page.goto("/create");

    const amountField = page.getByLabel("Amount owed");
    await expect(amountField).toBeVisible();

    await amountField.fill("25000");

    await expect(page.getByText("₦25,000")).toBeVisible();
  });

  test("a complete request is submitted for verification @affected", async ({ page }) => {
    await signUpThroughUi(page);

    await page.goto("/create");
    await expect(page.getByTestId("create-signed-in")).toBeVisible();

    await page.getByLabel("Bill title").fill("Lagos General Hospital — malaria treatment");
    await page.getByLabel("Amount owed").fill("25000");
    await page
      .getByLabel("What is this bill for?")
      .fill("Nine nights of admission for malaria; the ward bill is still outstanding.");

    await page.setInputFiles("#bill-proof", {
      name: "hospital-bill.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });

    await expect(page.getByText("Proof uploaded")).toBeVisible();
    await page.getByRole("button", { name: "Submit for verification" }).click();

    await expect(page.getByRole("heading", { name: "Pending verification" })).toBeVisible();

    // Clean up the disposable session created through the real UI.
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
  });
});
