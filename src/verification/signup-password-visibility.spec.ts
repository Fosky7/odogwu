import { test, expect } from "@playwright/test";

/**
 * Create-account flows touched by this change: the password and confirm-password
 * fields must start masked and each must have its own reveal toggle.
 */
test("sign-up password fields reveal independently and keep their values @affected", async ({
  page,
}) => {
  await page.goto("/signup");

  const password = page.getByTestId("signup-password");
  const confirmPassword = page.getByTestId("signup-confirm-password");
  const passwordToggle = page.getByTestId("signup-password-toggle");
  const confirmPasswordToggle = page.getByTestId("signup-confirm-password-toggle");
  const submit = page.getByTestId("signup-submit");

  // Masked on load, with one toggle per field.
  await expect(password).toBeVisible();
  await expect(confirmPassword).toBeVisible();
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmPassword).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Show password" })).toHaveCount(2);
  await expect(passwordToggle).toHaveText("Show password");
  await expect(confirmPasswordToggle).toHaveText("Show password");

  // Type into both fields so we can prove the reveal does not drop the values.
  await password.fill("Sup3rSecret1");
  await confirmPassword.fill("Sup3rSecret1");

  // Revealing the confirmation must not touch the field above it.
  await confirmPasswordToggle.click();
  await expect(confirmPassword).toHaveAttribute("type", "text");
  await expect(confirmPasswordToggle).toHaveText("Hide password");
  await expect(password).toHaveAttribute("type", "password");
  await expect(passwordToggle).toHaveText("Show password");
  await expect(password).toHaveValue("Sup3rSecret1");
  await expect(confirmPassword).toHaveValue("Sup3rSecret1");
  await expect(submit).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);

  // Revealing the first field is independent too, and both values survive.
  await passwordToggle.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(passwordToggle).toHaveText("Hide password");
  await expect(confirmPassword).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("Sup3rSecret1");
  await expect(confirmPassword).toHaveValue("Sup3rSecret1");

  // Hiding again restores the mask without clearing the input.
  await passwordToggle.click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(passwordToggle).toHaveText("Show password");
  await expect(password).toHaveValue("Sup3rSecret1");
  await expect(submit).toHaveText("Create account");

  // The toggle is a real button: reachable with Tab and activated with Space.
  await passwordToggle.focus();
  await expect(passwordToggle).toBeFocused();
  await page.keyboard.press("Space");
  await expect(password).toHaveAttribute("type", "text");
  await expect(passwordToggle).toHaveText("Hide password");

  await confirmPasswordToggle.focus();
  await expect(confirmPasswordToggle).toBeFocused();
  await page.keyboard.press("Space");
  await expect(confirmPassword).toHaveAttribute("type", "password");
  await expect(confirmPasswordToggle).toHaveText("Show password");
});
