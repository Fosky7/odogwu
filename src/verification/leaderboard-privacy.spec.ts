import { test, expect, type Page } from "@playwright/test";

/**
 * Dashboard name-visibility flow for the Odogwu leaderboard.
 *
 * One flow only: sign in through the real UI, open /dashboard, turn
 * "Show my name on the leaderboard" off, assert the anonymous note, reload and
 * assert the switch is still off (the choice was really persisted to the
 * owner-scoped `giver_profiles` row), then restore the account's original
 * choice.
 */
const EMAIL = process.env.E2E_USER_EMAIL ?? "";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "";

const ANONYMOUS_NOTE = "You will appear as Anonymous giver";

async function signIn(page: Page): Promise<void> {
  await page.goto("/");

  // The auth entry points live in the header menu; open it, then follow the
  // real "Sign in" link. Fall back to the app's login route if the menu cannot
  // be reached, so the flow still drives the real form.
  const menuButton = page.getByTestId("header-menu-button");
  if ((await menuButton.count()) > 0) {
    await menuButton.first().click();
  }

  const signInLink = page.getByRole("link", { name: /^sign in$/i });
  if ((await signInLink.count()) > 0) {
    await signInLink.first().click();
  } else {
    await page.goto("/login");
  }

  const emailField = page
    .locator('input[type="email"], input[name="email" i], input[autocomplete="email"]')
    .first();
  await expect(emailField).toBeVisible();
  await emailField.fill(EMAIL);

  const passwordField = page.locator('input[type="password"]').first();
  await expect(passwordField).toBeVisible();
  await passwordField.fill(PASSWORD);

  await page.getByRole("button", { name: /sign in|log in|continue/i }).first().click();
  await page.waitForURL((url) => !/sign|login|auth/i.test(url.pathname), {
    timeout: 20_000,
  });
}

test("dashboard name visibility hides the giver and stays off after reload @affected @database @persistence", async ({
  page,
}) => {
  test.skip(
    !EMAIL || !PASSWORD,
    "setup-required: the runner did not supply E2E_USER_EMAIL / E2E_USER_PASSWORD disposable accounts.",
  );

  await signIn(page);
  await page.goto("/dashboard");

  // 1. The giver's own card renders a rank slot and a naira total.
  await expect(page.getByTestId("your-giving-rank")).toBeVisible();
  await expect(page.getByTestId("giver-rank")).toBeVisible();
  await expect(page.getByTestId("giver-total")).toHaveText(/^\u20A6/);

  // 2. Turn the switch off through the real control.
  const toggle = page.getByTestId("leaderboard-privacy-switch");
  await expect(toggle).toBeEnabled();

  const startedVisible = await toggle.isChecked();
  if (startedVisible) {
    await toggle.click();
  }

  await expect(toggle).not.toBeChecked();
  await expect(page.getByTestId("leaderboard-anonymous-note")).toHaveText(ANONYMOUS_NOTE);

  // 3. A full reload must read the stored choice back from the backend.
  await page.reload();
  await expect(page.getByTestId("your-giving-rank")).toBeVisible();

  const reloadedToggle = page.getByTestId("leaderboard-privacy-switch");
  await expect(reloadedToggle).toBeEnabled();
  await expect(reloadedToggle).not.toBeChecked();
  await expect(page.getByTestId("leaderboard-anonymous-note")).toHaveText(ANONYMOUS_NOTE);

  // 4. Restore the account's original choice so the run leaves no residue.
  if (startedVisible) {
    await reloadedToggle.click();
    await expect(reloadedToggle).toBeChecked();
  }
});
