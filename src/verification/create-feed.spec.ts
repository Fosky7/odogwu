import { test, expect, type Page } from "@playwright/test";

/**
 * Sign in through the real login UI with the disposable account the runner
 * supplies. The create flow writes an owner-scoped bill request, so the account
 * is required; when it is not configured the test skips honestly instead of
 * faking a signed-in session or writing to browser storage directly.
 */
async function signInWithRunnerAccount(page: Page): Promise<void> {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    test.skip(
      true,
      "setup-required: E2E_USER_EMAIL and E2E_USER_PASSWORD are not configured for this run",
    );
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await krossRevealInMenu(page, page.getByTestId("header-signout"));
  await expect(page.getByTestId("header-signout")).toBeVisible({ timeout: 20_000 });
}

/** Fill the real /create form and submit a disposable bill request. */
async function submitBillRequest(page: Page, title: string): Promise<void> {
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "Request a bill" })).toBeVisible();
  await expect(page.getByTestId("create-signed-in")).toBeVisible();

  await page.getByLabel("Bill title").fill(title);
  await page.getByLabel("Amount owed").fill("25000");
  await page.getByLabel("Bill proof").setInputFiles({
    name: "e2e-bill-proof.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nE2E disposable bill proof\n"),
  });
  await expect(page.getByTestId("proof-uploaded")).toBeVisible();

  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByRole("heading", { name: "Pending verification" })).toBeVisible({
    timeout: 20_000,
  });
}

test("creates a bill and shows it on the feed @affected", async ({ page }) => {
  await signInWithRunnerAccount(page);
  const title = `E2E malaria bill ${Date.now()}`;

  await submitBillRequest(page, title);

  await page.goto("/feed");
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
    timeout: 20_000,
  });
});

test("keeps created bills after a full reload @affected", async ({ page }) => {
  await signInWithRunnerAccount(page);
  const title = `E2E reload bill ${Date.now()}`;

  await submitBillRequest(page, title);

  await page.goto("/feed");
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
    timeout: 20_000,
  });

  await page.reload();
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
    timeout: 20_000,
  });
});

// Added by KrossBuild: the app keeps its top-bar links inside a menu, so open it
// when a link is not already visible.
async function krossRevealInMenu(page: any, target: any) {
  if (await target.isVisible().catch(() => false)) return;
  const toggle = page.locator('header button[aria-expanded="false"], [role="banner"] button[aria-expanded="false"]').first();
  if (await toggle.count().catch(() => 0)) {
    await toggle.click().catch(() => {});
    await target.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  }
}
