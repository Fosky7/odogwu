import { test, expect, type Page } from "@playwright/test";

/**
 * @affected - Signed-in header has no duplicated "Dashboard" / "Sign out".
 *
 * The header bar carries only the brand and the hamburger toggle. Both account
 * actions must exist exactly once, and only inside the opened menu.
 */

const EMAIL = process.env.E2E_USER_EMAIL ?? "";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "";

async function signIn(page: Page) {
  await page.goto("/login");

  const emailField = page.getByLabel(/email/i).first();
  const passwordField = page.getByLabel(/password/i).first();

  await emailField.waitFor({ state: "visible" });
  await emailField.fill(EMAIL);
  await passwordField.fill(PASSWORD);

  await page
    .getByRole("button", { name: /sign in|log in/i })
    .first()
    .click();

  // Signed-in shell: the toggle is always present, and the signed-out doorway
  // is gone from the menu once a session exists.
  await page.getByTestId("menu-toggle").waitFor({ state: "visible", timeout: 20_000 });
  await expect(page.getByTestId("menu-toggle")).toHaveAttribute("aria-expanded", "false");
}

test.describe("@affected header account actions", () => {
  test.beforeEach(() => {
    test.skip(
      !EMAIL || !PASSWORD,
      "setup-required: E2E_USER_EMAIL / E2E_USER_PASSWORD are not configured for this run.",
    );
  });

  test("Dashboard and Sign out live only inside the hamburger menu", async ({ page }) => {
    await signIn(page);

    const header = page.getByTestId("site-header");
    await expect(header).toBeVisible();

    // Menu is closed after signing in: neither action is rendered anywhere in
    // the header bar, so there is no standalone duplicate to tap.
    await expect(page.getByTestId("site-menu")).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);

    // Tapping the hamburger reveals both actions exactly once.
    await page.getByTestId("menu-toggle").click();

    const menu = page.getByTestId("site-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(1);
    await expect(menu.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(1);

    // And they are the only copies on the page header.
    await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(1);
    await expect(header.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(1);

    // Closing the menu hides them again - nothing lingers in the bar.
    await page.getByTestId("menu-toggle").click();
    await expect(page.getByTestId("site-menu")).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
  });
});
