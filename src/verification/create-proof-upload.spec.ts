import { test, expect } from "@playwright/test";

/**
 * Module 7 · step 1 — the "Bill proof" uploader on /create, driven against the
 * real rendered page.
 *
 * The form only exists behind the sign-in gate, so this spec signs in through
 * the real login UI with the disposable account the runner supplies. Nothing
 * pre-existing is touched: the file uploaded here is generated in memory and
 * the request is never submitted.
 */

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;

/** A real 1x1 PNG, so no fixture file is needed on disk. */
const PROOF_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test.describe("create request proof upload @affected", () => {
  test("uploading a file to Bill proof on /create shows Proof uploaded @affected", async ({
    page,
  }) => {
    test.skip(
      !userEmail || !userPassword,
      "setup-required: the runner did not supply E2E_USER_EMAIL / E2E_USER_PASSWORD, so the signed-in /create proof upload flow cannot be exercised.",
    );

    // Sign in through the real form — the header only swaps to "Sign out" once
    // the session is genuinely live.
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(userEmail!);
    await page.getByLabel("Password", { exact: true }).fill(userPassword!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible({ timeout: 30000 });

    await page.goto("/create");
    await expect(page.getByRole("heading", { name: "Create a request", level: 1 })).toBeVisible(
      { timeout: 20000 },
    );

    // Before any upload the section offers the "Choose file" control and does
    // not yet claim the proof is attached.
    await expect(page.getByText("Choose file", { exact: true })).toBeVisible();
    await expect(page.getByText("Proof uploaded", { exact: false })).toHaveCount(0);

    await page.locator("#bill-proof").setInputFiles({
      name: "e2e-bill-proof.png",
      mimeType: "image/png",
      buffer: Buffer.from(PROOF_PNG_BASE64, "base64"),
    });

    // Accepting the file flips the uploader into its uploaded state and names
    // the exact file that was attached.
    const status = page.getByTestId("proof-upload-status");
    await expect(status).toBeVisible({ timeout: 10000 });
    await expect(status).toContainText("Proof uploaded");
    await expect(status).toContainText("e2e-bill-proof.png");
  });
});
