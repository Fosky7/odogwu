import { test, expect } from "@playwright/test";

/** A random address that has never been registered, so sign-in must fail. */
function unregisteredEmail(): string {
  return `e2e.unregistered.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`;
}

test("login shows an error for an unregistered email @affected", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email", { exact: true }).fill(unregisteredEmail());
  await page.getByLabel("Password", { exact: true }).fill("DefinitelyWrongPass1!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");
  await expect(page).toHaveURL(/\/login$/);
});

test("signing in with a seeded account shows Sign out and Dashboard @affected", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  test.skip(
    !email || !password,
    "setup-required: E2E_USER_EMAIL / E2E_USER_PASSWORD were not supplied for this run.",
  );

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email as string);
  await page.getByLabel("Password", { exact: true }).fill(password as string);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
});

/**
 * Module 2 · signup flow.
 *
 * Drives the real /signup form against the connected backend:
 *  1. typing a phone number keeps the entered value in the field;
 *  2. completing the form and pressing "Create account" signs the person in,
 *     which the shared header proves by showing the "Sign out" button.
 * Only a freshly generated disposable address is used, so no pre-existing
 * account is touched.
 */
test("signup keeps the phone number and creates a signed-in account @affected", async ({ page }) => {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.disposable.${unique}@example.com`;
  const password = `Disposable-${unique}!`;

  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account", level: 1 }),
  ).toBeVisible();

  // Typing a phone number must keep the entered value in the field.
  const phoneField = page.getByLabel("Phone number", { exact: true });
  await phoneField.fill("08012345678");
  await expect(phoneField).toHaveValue("08012345678");

  // Moving focus to another field must not clear or reformat the number.
  await page.getByLabel("Full name", { exact: true }).fill("E2E Disposable User");
  await expect(phoneField).toHaveValue("08012345678");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  await page.getByRole("button", { name: "Create account", exact: true }).click();

  // The created account lands in the app with the signed-in header actions.
  const signOutButton = page.getByRole("button", { name: "Sign out", exact: true });
  await expect(signOutButton).toBeVisible({ timeout: 30000 });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();

  // The captured phone number is persisted with the account profile.
  await expect(page.getByText("08012345678")).toBeVisible();
});
