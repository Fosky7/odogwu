import { test, expect } from "@playwright/test";

/**
 * The sign-in password field must mask what is typed, and its inline
 * "Show password" toggle must reveal the typed characters (and re-mask them)
 * without losing the value, submitting the form or raising a validation error.
 */
test.describe("@affected sign in password visibility toggle", () => {
  test("reveals and re-masks the typed password on /login", async ({ page }) => {
    await page.goto("/login");

    const passwordField = page.getByTestId("login-password");
    const showToggle = page.getByRole("button", { name: "Show password", exact: true });

    // Masked on load, with the reveal toggle sitting next to the field.
    await expect(passwordField).toBeVisible();
    await expect(passwordField).toHaveAttribute("type", "password");
    await expect(showToggle).toBeVisible();

    // Type a value, then reveal it.
    await passwordField.fill("Sup3rSecret!");
    await showToggle.click();

    const hideToggle = page.getByRole("button", { name: "Hide password", exact: true });
    await expect(hideToggle).toBeVisible();
    await expect(showToggle).toHaveCount(0);
    await expect(passwordField).toHaveAttribute("type", "text");
    await expect(passwordField).toHaveValue("Sup3rSecret!");

    // Keyboard path: the focused toggle re-masks with Enter, keeping the value
    // and leaving the form untouched (no submit, no validation error).
    await hideToggle.focus();
    await page.keyboard.press("Enter");

    await expect(passwordField).toHaveAttribute("type", "password");
    await expect(passwordField).toHaveValue("Sup3rSecret!");
    await expect(page.getByTestId("signin-form")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByTestId("signin-error")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/login");

    // And back to readable text with the keyboard, still keeping the value.
    await page.keyboard.press("Enter");
    await expect(passwordField).toHaveAttribute("type", "text");
    await expect(passwordField).toHaveValue("Sup3rSecret!");
    await expect(page.getByTestId("signin-error")).toHaveCount(0);
  });
});
