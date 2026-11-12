import { test, expect } from "@playwright/test";

test.describe("dashboard empty state @affected", () => {
  test("a new donor sees No pledges yet and Browse bills opens the feed", async ({
    page,
  }) => {
    // A brand-new donor has no stored pledges.
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        // ignore storage access issues on the initial about:blank document
      }
    });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();
    await expect(page.getByText("No pledges yet")).toBeVisible();

    const browseBills = page.getByTestId("browse-bills-empty");
    await expect(browseBills).toBeVisible();
    await expect(browseBills).toHaveText(/browse bills/i);

    await browseBills.click();
    await expect(page).toHaveURL(/\/feed$/);
  });
});
