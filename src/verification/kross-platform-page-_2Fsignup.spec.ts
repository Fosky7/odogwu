// KROSS_SIGNUP_LEGAL_AGREEMENT v1
//
// One flow: creating an account on /signup now requires agreeing to the legal
// pages. The first test walks that whole flow (unticked by default, blocked
// submit, keyboard consent, reload reset, real account creation). The second
// test covers the legal links the checkbox points at.
//
// Email delivery is NOT asserted here: no controlled disposable inbox is
// configured for this run, so the delivered confirmation email remains pending
// evidence. Nothing in the app is mocked or weakened, and the password used is
// generated per run for a brand new disposable address.
import { test, expect } from '@playwright/test';

const TERMS_LABEL = 'I agree to the Terms of Service and Privacy Policy';
const TERMS_ERROR =
  'Please agree to the Terms of Service and Privacy Policy to continue';

function disposableEmail(): string {
  const stamp = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  return `kross.signup.${stamp}@example.com`;
}

async function fillValidSignup(
  page: import('@playwright/test').Page,
  email: string,
) {
  await page.getByTestId('signup-full-name').fill('Kross Verification');
  await page.getByTestId('signup-email').fill(email);
  await page.getByTestId('signup-password').fill('Kross-Verify-2026');
  await page.getByTestId('signup-confirm-password').fill('Kross-Verify-2026');
}

test('signup requires agreeing to the legal terms before an account is created @affected', async ({
  page,
}) => {
  const email = disposableEmail();

  await page.goto('/signup');

  const checkbox = page.getByTestId('signup-terms');
  const submit = page.getByTestId('signup-submit');
  const termsError = page.getByTestId('signup-terms-error');

  // 1. The agreement is visible, unticked, and sits above "Create account".
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(submit).toBeVisible();
  const checkboxBox = await checkbox.boundingBox();
  const submitBox = await submit.boundingBox();
  expect(checkboxBox, 'the agreement checkbox must have a layout box').not.toBeNull();
  expect(submitBox, 'the submit button must have a layout box').not.toBeNull();
  expect(checkboxBox!.y).toBeLessThan(submitBox!.y);

  const label = page.locator('label[for="signup-terms"]');
  await expect(label).toContainText(TERMS_LABEL);

  // 2. Valid details + unticked box -> the exact message, and no account is
  // created: the form is still on /signup and no confirmation step appeared.
  await fillValidSignup(page, email);
  await submit.click();

  await expect(termsError).toBeVisible();
  await expect(termsError).toHaveText(TERMS_ERROR);
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByTestId('signup-terms')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

  // 3. Keyboard consent: Tab from the last field lands on the checkbox, Space
  // ticks it and the blocking message disappears.
  await page.getByTestId('signup-confirm-password').focus();
  await page.keyboard.press('Tab');
  await expect(checkbox).toBeFocused();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await expect(termsError).toHaveCount(0);

  // 4. Consent is not persisted: a reload shows the box unticked again.
  await page.reload();
  await expect(page.getByTestId('signup-terms')).not.toBeChecked();

  // 5. The same details with the box ticked really create the account: the
  // signup form is replaced (confirmation step or signed-in landing page).
  await fillValidSignup(page, email);
  await page.getByTestId('signup-terms').check();
  await expect(page.getByTestId('signup-terms')).toBeChecked();
  await page.getByTestId('signup-submit').click();

  await expect(async () => {
    const formGone = (await page.getByTestId('signup-terms').count()) === 0;
    expect(formGone, 'the signup form should close after a consented submit').toBe(
      true,
    );
  }).toPass({ timeout: 30000 });

  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
});

test('signup legal agreement links open the Terms of Service and Privacy Policy @affected', async ({
  page,
}) => {
  await page.goto('/signup');

  const label = page.locator('label[for="signup-terms"]');
  await expect(label).toBeVisible();

  // Terms of Service link inside the agreement text.
  await label.getByRole('link', { name: 'Terms of Service' }).click();
  await expect(page).toHaveURL(/\/legal\/terms$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Terms of Service' }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/signup$/);

  // Privacy Policy link inside the same agreement text.
  const backLabel = page.locator('label[for="signup-terms"]');
  await expect(backLabel).toBeVisible();
  await backLabel.getByRole('link', { name: 'Privacy Policy' }).click();
  await expect(page).toHaveURL(/\/legal\/privacy$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
  ).toBeVisible();

  // Returning to the form leaves the agreement unticked: navigating away to
  // read the legal pages does not count as consent.
  await page.goBack();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByTestId('signup-terms')).not.toBeChecked();
});
