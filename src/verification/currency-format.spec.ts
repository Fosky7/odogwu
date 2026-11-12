import { test, expect } from "@playwright/test";

test.describe("@affected Naira formatting", () => {
  test("home page shows the sample bill amount formatted in Naira with thousands separators", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "A bill that needs clearing" })).toBeVisible();

    // The formatted amount must start with the Naira symbol and use comma grouping.
    const formattedAmount = page.getByText(/^-?₦\d{1,3}(,\d{3})*(\.\d{2})?$/).first();
    await expect(formattedAmount).toBeVisible();

    const text = (await formattedAmount.textContent())?.trim() ?? "";
    expect(text.startsWith("₦")).toBe(true);
    expect(text).toMatch(/^-?₦\d{1,3}(,\d{3})*(\.\d{2})?$/);
    // A five-figure sample amount must contain a comma separator (e.g. ₦45,000).
    expect(text).toContain(",");
  });
});
