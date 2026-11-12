import { test, expect } from "@playwright/test";

/**
 * Module 7 · step 1 — the bill proof uploader on /create.
 *
 * The uploader only exists on the signed-in create form, so this test signs in
 * through the real login page with the disposable account the runner supplies.
 * Choosing a file is a client-side selection only; nothing is written to any
 * record until the form is submitted, so there is no data to clean up.
 */

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

test.describe("bill proof upload @affected", () => {
  test("choosing a file for Bill proof shows Proof uploaded @affected", async ({
    page,
  }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.annotations.push({
        type: "setup-required",
        description:
          "E2E_USER_EMAIL and E2E_USER_PASSWORD were not supplied, so the signed-in /create page cannot be reached.",
      });
      test.skip(true, "Disposable account credentials are not available in this run.");
      return;
    }

    // Sign in through the real UI so /create renders its form instead of the gate.
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible({ timeout: 30000 });

    await page.goto("/create");
    await expect(
      page.getByRole("heading", { name: "Create a request", exact: true }),
    ).toBeVisible({ timeout: 20000 });

    const proofSection = page.getByTestId("proof-upload");
    await expect(proofSection).toBeVisible();

    // Before any upload the section offers its "Choose file" control and no
    // uploaded state.
    await expect(
      proofSection.getByRole("button", { name: "Choose file", exact: true }),
    ).toBeVisible();
    await expect(proofSection.getByText("No file chosen yet")).toBeVisible();
    await expect(proofSection.getByText("Proof uploaded")).toHaveCount(0);

    // Upload a real (disposable) file through the labelled proof input.
    await page.getByLabel("Bill proof", { exact: true }).setInputFiles({
      name: "disposable-bill-proof.png",
      mimeType: "image/png",
      buffer: Buffer.from("disposable bill proof fixture", "utf8"),
    });

    // The uploader reports the accepted file by name and shows the uploaded state.
    await expect(proofSection.getByTestId("proof-uploaded")).toBeVisible();
    await expect(proofSection.getByTestId("proof-uploaded")).toHaveText("Proof uploaded");
    await expect(proofSection.getByTestId("proof-file-name")).toHaveText(
      "disposable-bill-proof.png",
    );

    // Removing the proof puts the control back into its empty state.
    await proofSection.getByRole("button", { name: "Remove proof", exact: true }).click();
    await expect(proofSection.getByText("Proof uploaded")).toHaveCount(0);
    await expect(proofSection.getByText("No file chosen yet")).toBeVisible();
  });
});
