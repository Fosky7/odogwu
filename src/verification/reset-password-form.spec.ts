// Real browser flow for setting a new password after following the emailed
// reset link (the second half of the sign-in page's "Forgot password?" flow),
// including the /reset-password route shell a signed-out visitor can reach.
import { test, expect } from "@playwright/test";

test("reset password route renders both fields, blocks invalid entries and links back to sign in @affected", async ({
  page,
}) => {
  // Watch the real account-update endpoint so invalid entries can be proven to
  // write nothing to the connected backend.
  const updateWrites: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/user") && request.method() !== "GET") {
      updateWrites.push(`${request.method()} ${request.url()}`);
    }
  });

  // 0. The route shell is registered: a signed-out visitor opening the deep
  //    link stays on /reset-password and sees the page heading.
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/reset-password/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Set a new password" }),
  ).toBeVisible();

  const newPassword = page.getByLabel("New password", { exact: true });
  const confirmPassword = page.getByLabel("Confirm password", { exact: true });
  const submit = page.getByRole("button", { name: "Update password" });

  await expect(newPassword).toBeVisible();
  await expect(confirmPassword).toBeVisible();
  await expect(submit).toBeVisible();

  // 1. Too short: the inline rule shows and nothing is written.
  await newPassword.fill("short");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText(
    "Password must be at least 8 characters.",
  );
  await expect(page.getByTestId("reset-password-success")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(updateWrites).toHaveLength(0);

  // 2. Repeat entry differs: same inline rule, still nothing written.
  await newPassword.fill("newpassword123");
  await confirmPassword.fill("different123");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("Passwords do not match.");
  await expect(page.getByTestId("reset-password-success")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(updateWrites).toHaveLength(0);

  // 3. The page offers a single way back to the real sign-in form.
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL(/\/login\/?$/);
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

// The finishing half of this flow only exists inside the reset email that the
// connected backend delivers to the disposable account. No controlled inbox is
// configured for this run, so the update evidence stays pending instead of
// being faked or by changing a real account's password.
test("password is updated from the delivered reset link @affected", async ({ page }) => {
  const recoveryLink = process.env.E2E_PASSWORD_RECOVERY_LINK;

  test.info().annotations.push({
    type: "setup-required",
    description:
      "A controlled inbox for the disposable account's reset email (E2E_PASSWORD_RECOVERY_LINK) is needed to open the real recovery link and confirm the password update.",
  });

  test.skip(
    !recoveryLink,
    "setup-required: no controlled inbox is configured, so the delivered reset email cannot be opened for this run.",
  );

  await page.goto(String(recoveryLink));
  await expect(
    page.getByRole("heading", { level: 1, name: "Set a new password" }),
  ).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill("recovered123");
  await page.getByLabel("Confirm password", { exact: true }).fill("recovered123");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.getByTestId("reset-password-success")).toHaveText(
    "Password updated. You can now sign in.",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});
