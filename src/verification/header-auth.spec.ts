import { test, expect } from "@playwright/test";

/**
 * Module 2 · the account-aware header.
 *
 * The shared shell renders one of three header states depending on the session
 * it reads through `useAuth()`. This spec covers the signed-out state on the
 * home page: a visitor with no stored session must see the two real account
 * doorways in the header, pointing at the sign-in and sign-up routes, and using
 * the "Create account" doorway must actually navigate to the sign-up page.
 *
 * Only the header is asserted here (`role="banner"`), so the in-page doorways
 * on the home page stay covered by their own flow. No account is created, so
 * nothing pre-existing is touched.
 */

test.describe("account-aware header @affected", () => {
  test("a signed-out visitor sees the Sign in and Create account doorways on / @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header).toBeVisible();

    const signInLink = header.getByRole("link", { name: "Sign in" });
    const createAccountLink = header.getByRole("link", { name: "Create account" });

    // The session has been read (the placeholder is gone) and both doorways show.
    await expect(header.getByRole("status")).toHaveCount(0);
    await krossRevealInMenu(page, signInLink);
    await expect(signInLink).toBeVisible();
    await krossRevealInMenu(page, createAccountLink);
    await expect(createAccountLink).toBeVisible();

    // They are real links to the account pages, not buttons that do nothing.
    await expect(signInLink).toHaveAttribute("href", "/login");
    await expect(createAccountLink).toHaveAttribute("href", "/signup");

    // Perform the action and assert its outcome.
    await krossRevealInMenu(page, createAccountLink);
    await createAccountLink.click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();
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
