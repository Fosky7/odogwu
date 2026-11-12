import { test, expect } from "@playwright/test";

/**
 * Module 8 · step 5 — the "Make a pledge" sheet and the feed's Pledge/Skip pair,
 * driven through the real rendered UI.
 *
 * The remaining balance is read off the rendered sheet (never hard-coded), so
 * the test follows whatever the verified bill actually owes. Three flows are
 * covered, one test each: opening the sheet prefilled, keeping a typed amount
 * exactly as entered, and Skip advancing the feed without ever opening the
 * sheet.
 */

test.describe("pledge sheet @affected", () => {
  test("Pledge on the feed opens Make a pledge with the remaining balance prefilled @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    const pledgeButton = page.getByRole("button", { name: "Pledge", exact: true });
    await expect(pledgeButton).toBeVisible({ timeout: 20000 });
    await pledgeButton.click();

    const sheet = page.getByTestId("pledge-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });
    await expect(sheet.getByRole("heading", { name: "Make a pledge" })).toBeVisible();

    const amountField = sheet.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();

    // The amount is prefilled with the balance still owed, in Naira.
    const remainingText = await sheet.getByTestId("pledge-sheet-remaining").innerText();
    expect(remainingText).toContain("\u20A6");

    const remainingDigits = remainingText.replace(/[^0-9.]/g, "");
    expect(remainingDigits.length).toBeGreaterThan(0);
    await expect(amountField).toHaveValue(remainingDigits);
  });

  test("typing an amount in Make a pledge keeps the entered value @affected", async ({ page }) => {
    await page.goto("/feed");

    await page.getByRole("button", { name: "Pledge", exact: true }).click();

    const sheet = page.getByTestId("pledge-sheet");
    await expect(sheet).toBeVisible({ timeout: 20000 });

    const amountField = sheet.getByLabel("Amount", { exact: true });
    await expect(amountField).toBeVisible();

    // What is typed stays in the field, and the sheet echoes it in Naira.
    await amountField.fill("5000");
    await expect(amountField).toHaveValue("5000");
    await expect(sheet).toContainText("\u20A65,000");

    await amountField.fill("1250");
    await expect(amountField).toHaveValue("1250");
  });

  test("Skip on the feed moves to the next bill without opening Make a pledge @affected", async ({
    page,
  }) => {
    await page.goto("/feed");

    const beneficiary = page.getByTestId("feed-beneficiary");
    await expect(beneficiary).toBeVisible({ timeout: 20000 });
    const firstBeneficiary = await beneficiary.innerText();

    // The sheet must not be mounted before the skip, so "still closed" is a real
    // assertion rather than an accidental pass.
    await expect(page.getByTestId("pledge-sheet")).toHaveCount(0);

    await page.getByRole("button", { name: "Skip", exact: true }).click();

    // The deck advanced to a different bill…
    await expect(beneficiary).not.toHaveText(firstBeneficiary, { timeout: 20000 });

    // …and skipping never opened the pledge sheet, so no amount is on screen.
    await expect(page.getByTestId("pledge-sheet")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Make a pledge" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pledge", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/feed$/);
  });
});
