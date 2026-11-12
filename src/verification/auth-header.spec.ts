import { test, expect } from "@playwright/test";

/**
 * Module 2 · step 2 acceptance: the root layout renders every route inside the
 * session provider and the shared shell, so a signed-out visitor arriving on /
 * sees the two header doorways — "Sign in" (/login) and "Create account"
 * (/signup) — and none of the signed-in actions.
 *
 * One test per flow: the click-through from these header doorways into /login
 * and /signup is covered by the header-doorways flow, and the sign-in / sign-up
 * submissions themselves belong to their own specs, so this test only asserts
 * what the shell renders by default.
 */
test.describe("account-aware header @affected", () => {
  test("signed-out home page shows Sign in and Create account doorways @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header).toBeVisible();

    // The shell brands itself and links home.
    const brandLink = header.getByRole("link", { name: "Odogwu home" });
    await krossRevealInMenu(page, brandLink);
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toHaveAttribute("href", "/");

    const signInLink = header.getByRole("link", { name: "Sign in" });
    await krossRevealInMenu(page, signInLink);
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/login");

    const createAccountLink = header.getByRole("link", { name: "Create account" });
    await krossRevealInMenu(page, createAccountLink);
    await expect(createAccountLink).toBeVisible();
    await expect(createAccountLink).toHaveAttribute("href", "/signup");

    // A signed-out visitor must not be offered the signed-in action.
    await expect(header.getByRole("button", { name: "Sign out", exact: true })).toHaveCount(0);
  });
});

// Added by KrossBuild: the app keeps its top-bar links inside a menu, so open it
// when a link is not already visible.
async function krossRevealInMenu(page: any, target: any) {
  if (await target.isVisible().catch(() => false)) return;
  const toggle = page.locator('header button[aria-expanded="false"], [role="banner"] button[aria-expanded="false"]').first();
  if (await toggle.count().catch(() => 0)) {
    await toggle.click().catch(() => {});
    await target.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  }
}
