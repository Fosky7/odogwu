import { test, expect, type Page } from "@playwright/test";

/**
 * Ordering flow for the public Odogwu leaderboard.
 *
 * One flow only: open /leaderboard against the connected backend and lock the
 * two rules the page exists to serve —
 *
 *   1. the "Top givers" list is ordered from the highest total to the lowest,
 *      and a full reload keeps that same ranked order; and
 *   2. switching to "This month" and back to "All time" restores the same
 *      first-place giver.
 *
 * Every total is read from the rendered rows (the SECURITY DEFINER aggregate
 * over settled payments), so nothing here can be satisfied by a browser-written
 * pledge.
 */
const NAIRA = "\u20A6";

function toNaira(text: string): number {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

async function firstGiverName(page: Page): Promise<string> {
  return (
    await page.getByTestId("leaderboard-row").first().getByTestId("leaderboard-name").innerText()
  )
    .trim()
    .replace(/\s+/g, " ");
}

test("Top givers run highest to lowest and the filter round-trip keeps the same leader @affected", async ({
  page,
}) => {
  await page.goto("/leaderboard");

  await expect(
    page.getByRole("heading", { level: 1, name: "Odogwu leaderboard" }),
  ).toBeVisible();

  // Wait for the ranked list to settle (loading → ready) before reading it.
  const table = page.getByTestId("leaderboard-table");
  await expect(table).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Top givers" })).toBeVisible();

  // 1. The first-place row carries the Odogwu badge.
  await expect(
    page.getByTestId("leaderboard-row").first().getByTestId("odogwu-badge"),
  ).toBeVisible();

  // 2. Totals must be ordered from the highest to the lowest, every one naira.
  const totals = await page.getByTestId("leaderboard-total").allInnerTexts();
  expect(totals.length).toBeGreaterThanOrEqual(2);

  for (const total of totals) {
    expect(total).toContain(NAIRA);
  }

  const amounts = totals.map(toNaira);
  for (let index = 1; index < amounts.length; index += 1) {
    expect(amounts[index]).toBeLessThanOrEqual(amounts[index - 1]);
  }

  // 3. A full reload must keep the same ranked order and the same leader.
  const leaderBefore = await firstGiverName(page);
  await page.reload();
  await expect(table).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  await expect.poll(() => firstGiverName(page)).toBe(leaderBefore);

  // 4. This month → back to All time restores the same first-place giver.
  const allTime = page.getByRole("button", { name: "All time" });
  const thisMonth = page.getByRole("button", { name: "This month" });

  await expect(allTime).toHaveAttribute("aria-pressed", "true");

  await thisMonth.click();
  await expect(thisMonth).toHaveAttribute("aria-pressed", "true");
  await expect(allTime).toHaveAttribute("aria-pressed", "false");

  await allTime.click();
  await expect(allTime).toHaveAttribute("aria-pressed", "true");
  await expect(thisMonth).toHaveAttribute("aria-pressed", "false");

  await expect(table).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  await expect.poll(() => firstGiverName(page)).toBe(leaderBefore);
});
