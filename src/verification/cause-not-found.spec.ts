import { test, expect } from "@playwright/test";

test("unknown bill at /cause/999 shows the missing-bill state and Back to feed opens the feed @affected", async ({
  page,
}) => {
  await page.goto("/cause/999");

  await expect(
    page.getByRole("heading", { name: /couldn.t find that bill/i }),
  ).toBeVisible();

  const backToFeed = page.getByRole("link", { name: /back to feed/i });
  await expect(backToFeed).toBeVisible();

  await backToFeed.click();
  await expect(page).toHaveURL(/\/feed\/?$/);
});
