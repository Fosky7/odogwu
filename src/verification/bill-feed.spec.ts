import { test, expect } from "@playwright/test";

test.describe("verified bill feed and swipe deck", () => {
  test("@affected home swipe deck shows the Adaeze bill with a Verified badge", async ({ page }) => {
    await page.goto("/");

    const deck = page.getByTestId("swipe-deck");
    await expect(deck).toBeVisible();
    await expect(deck.getByTestId("deck-beneficiary")).toHaveText("Adaeze");
    await expect(deck.getByTestId("deck-amount")).toContainText("₦25,000");
    await expect(deck.getByText("Verified", { exact: true })).toBeVisible();
  });

  test("@affected home skip moves the deck to a different beneficiary", async ({ page }) => {
    await page.goto("/");

    const deck = page.getByTestId("swipe-deck");
    const first = await deck.getByTestId("deck-beneficiary").innerText();

    await page.getByRole("button", { name: "Skip" }).click();

    await expect(deck.getByTestId("deck-beneficiary")).not.toHaveText(first);
    await expect(deck.getByText("Verified", { exact: true })).toBeVisible();
  });

  test("@affected Browse all bills opens the verified bills feed", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("browse-all-bills").click();

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole("heading", { name: "Verified bills" })).toBeVisible();
  });

  test("@affected feed shows a hospital bill with a Raised progress line", async ({ page }) => {
    await page.goto("/feed");

    await expect(page.getByRole("heading", { name: "Verified bills" })).toBeVisible();

    const card = page.getByTestId("feed-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Hospital bill", { exact: true })).toBeVisible();
    await expect(card.getByText(/Raised/)).toBeVisible();
    await expect(card.getByText("Verified", { exact: true })).toBeVisible();
    await expect(card.getByTestId("feed-beneficiary")).toHaveText("Adaeze");
  });

  test("@affected feed Skip shows the next bill card with a different beneficiary", async ({ page }) => {
    await page.goto("/feed");

    const beneficiary = page.getByTestId("feed-beneficiary");
    const first = await beneficiary.innerText();

    await page.getByRole("button", { name: "Skip" }).click();

    await expect(beneficiary).not.toHaveText(first);
    await expect(page.getByTestId("feed-card").getByText("Verified", { exact: true })).toBeVisible();
  });
});
