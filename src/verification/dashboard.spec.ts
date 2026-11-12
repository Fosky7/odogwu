import { test, expect } from "@playwright/test";

test.describe("@affected dashboard", () => {
  test("lists pledges with receipt links and requests with funding progress", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    const pledges = page.getByTestId("my-pledges");
    await expect(pledges).toBeVisible();
    const firstPledge = page.getByTestId("pledge-row").first();
    await expect(firstPledge).toBeVisible();
    await expect(firstPledge.getByTestId("pledge-amount")).toBeVisible();
    const receiptLink = firstPledge.getByRole("link", { name: "View receipt" });
    await expect(receiptLink).toBeVisible();
    await expect(receiptLink).toHaveAttribute("href", /\/receipt\//);

    const requests = page.getByTestId("my-requests");
    await expect(requests).toBeVisible();
    const firstRequest = page.getByTestId("request-row").first();
    await expect(firstRequest).toBeVisible();
    await expect(firstRequest.getByTestId("request-status")).toBeVisible();
    await expect(firstRequest.getByTestId("request-progress")).toBeVisible();
    await expect(firstRequest.getByTestId("request-raised")).toBeVisible();
    await expect(firstRequest.getByTestId("request-remaining")).toBeVisible();
    await expect(requests).toContainText("Pending verification");
    await expect(requests).toContainText("Raised");
    await expect(requests).toContainText("Remaining");
  });

  test("opens a payment receipt from a pledge row", async ({ page }) => {
    await page.goto("/dashboard");

    const link = page.getByTestId("pledge-receipt-link").first();
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/receipt\//);
    await expect(page.getByText(/Payment receipt/i)).toBeVisible();
  });
});
