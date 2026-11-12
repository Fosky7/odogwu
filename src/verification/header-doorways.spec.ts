import { test, expect } from "@playwright/test";

/**
 * Module 2 — account doorways out of the home page.
 *
 * Step 2 acceptance (the signed-out header exposes both doorways) and step 5
 * acceptance (the home-page doorways open the real sign-in / sign-up pages) are
 * the same navigation flow, so they are verified here rather than in a second
 * copy of the same test:
 *
 *   - the "Sign in" doorway (hero, closing CTA and header) opens the page
 *     headlined "Welcome back";
 *   - the "Create account" doorway (hero, closing CTA and header) opens the page
 *     headlined "Create your account".
 *
 * One test per flow. The credential flows themselves live in
 * src/verification/signup.spec.ts and src/verification/login.spec.ts, and the
 * signed-out header rendering in src/verification/auth-header.spec.ts, so
 * neither is duplicated here.
 */

test.describe("home page account doorways @affected", () => {
  test("the Sign in doorway opens the Welcome back page @affected", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await krossRevealInMenu(page, header.getByRole("link", { name: "Sign in" }));
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();

    // Hero doorway: it must point at the real /login route, not a placeholder.
    const heroSignIn = page.getByTestId("home-hero-signin-doorway");
    await expect(heroSignIn).toBeVisible();
    await expect(heroSignIn).toHaveAttribute("href", "/login");

    await heroSignIn.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // Closing call-to-action doorway reaches the very same page.
    await page.goto("/");
    const ctaSignIn = page.getByTestId("home-cta-signin-doorway");
    await expect(ctaSignIn).toBeVisible();
    await ctaSignIn.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    // The header doorway on / opens the same page. The auth tabs now live
    // inside the collapsed header menu, so the real menu is opened first.
    await page.goto("/");
    const headerSignIn = page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true });
    await krossRevealInMenu(page, headerSignIn);
    await expect(headerSignIn).toBeVisible();
    await headerSignIn.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("the Create account doorway opens the Create your account page @affected", async ({
    page,
  }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await krossRevealInMenu(page, header.getByRole("link", { name: "Create account" }));
    await expect(header.getByRole("link", { name: "Create account" })).toBeVisible();

    // Hero doorway: it must point at the real /signup route.
    const heroSignUp = page.getByTestId("home-hero-signup-doorway");
    await expect(heroSignUp).toBeVisible();
    await expect(heroSignUp).toHaveAttribute("href", "/signup");

    await heroSignUp.click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

    // Closing call-to-action doorway reaches the very same page.
    await page.goto("/");
    const ctaSignUp = page.getByTestId("home-cta-signup-doorway");
    await expect(ctaSignUp).toBeVisible();
    await ctaSignUp.click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

    // The header doorway on / opens the same page. The auth tabs now live
    // inside the collapsed header menu, so the real menu is opened first.
    await page.goto("/");
    const headerSignUp = page
      .getByRole("banner")
      .getByRole("link", { name: "Create account", exact: true });
    await krossRevealInMenu(page, headerSignUp);
    await expect(headerSignUp).toBeVisible();
    await headerSignUp.click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
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
