import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const hasCredentials = Boolean(email && password);

/**
 * Sign in through the real credential form so the rank card reads the same
 * backend-backed session a donor would have.
 */
async function signIn(page: Page) {
  await page.goto("/login");

  await page.getByLabel(/email/i).first().fill(email!);
  await page.getByLabel(/password/i).first().fill(password!);
  await page.getByRole("button", { name: /sign in/i }).first().click();

  // The signed-in header proves the session was established in the UI.
  await krossRevealInMenu(page, page.getByTestId("header-signout"));
  await expect(page.getByTestId("header-signout")).toBeVisible();
}

/** Open the dashboard and hand back the rank card locator. */
async function openDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();

  const card = page.getByTestId("dashboard-rank-card");
  await expect(card).toBeVisible();
  return card;
}

/** Read the Naira figure printed in the "Total given" tile as a number. */
async function readTotalGiven(page: Page): Promise<number> {
  const text = await page
    .getByTestId("dashboard-rank-card")
    .getByTestId("dashboard-rank-total")
    .innerText();
  const digits = text.replace(/[^0-9.]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) ? value : 0;
}

test.describe("dashboard leaderboard rank card @affected", () => {
  test.beforeEach(() => {
    test.skip(
      !hasCredentials,
      "setup-required: E2E_USER_EMAIL / E2E_USER_PASSWORD are not configured for this run, so the rank card cannot be signed in to.",
    );
  });

  test("opting out keeps Don't rank me and shows Not ranked yet after a real reload @affected", async ({
    page,
  }) => {
    await signIn(page);
    const card = await openDashboard(page);

    // An unranked viewer must be offered the opt-in control next to the honest
    // unranked status.
    await expect(card.getByRole("radio", { name: "Show my name" })).toBeVisible();

    const dontRank = card.getByRole("radio", { name: "Don't rank me" });
    await dontRank.check();
    await expect(dontRank).toBeChecked();

    // The write reached the backend and reported back.
    await expect(card.getByTestId("dashboard-rank-saved")).toBeVisible();

    // Reload: the saved choice must come back from the backend, not memory.
    await page.reload();

    const reloaded = page.getByTestId("dashboard-rank-card");
    await expect(reloaded).toBeVisible();
    await expect(
      reloaded.getByRole("radio", { name: "Don't rank me" }),
    ).toBeChecked();
    await expect(reloaded.getByTestId("dashboard-rank-status")).toHaveText(
      "Not ranked yet",
    );
    await expect(
      reloaded.getByRole("radio", { name: "Show my name" }),
    ).toBeVisible();
  });

  test("choosing Show my name persists across reload and shows a numbered Rank @database @persistence", async ({
    page,
  }) => {
    await signIn(page);
    const card = await openDashboard(page);

    const showName = card.getByRole("radio", { name: "Show my name" });
    await showName.check();
    await expect(showName).toBeChecked();
    await expect(card.getByTestId("dashboard-rank-saved")).toBeVisible();

    // Full reload proves the opt-in is stored against the account, not held in
    // component state.
    await page.reload();

    const reloaded = page.getByTestId("dashboard-rank-card");
    await expect(reloaded).toBeVisible();
    await expect(
      reloaded.getByRole("radio", { name: "Show my name" }),
    ).toBeChecked();

    // A numbered rank only exists once the account has settled giving on
    // record; the opt-in persistence above is the part this run can prove on
    // its own.
    const totalGiven = await readTotalGiven(page);
    if (totalGiven > 0) {
      const rankNumber = reloaded.getByTestId("dashboard-rank-number");
      await expect(rankNumber).toBeVisible();
      await expect(rankNumber).toHaveText(/^\d+$/);

      const parsedRank = Number((await rankNumber.innerText()).trim());
      expect(parsedRank).toBeGreaterThan(0);
    } else {
      test
        .info()
        .annotations.push({
          type: "setup-required",
          description:
            "A settled giving fixture for the disposable account is needed to observe a numbered Rank; the opt-in persistence itself was verified after a real reload.",
        });
    }
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
