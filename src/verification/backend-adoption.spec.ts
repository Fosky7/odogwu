import { test, expect, type Page } from "@playwright/test";

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;

async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(userEmail!);
  await page.getByLabel(/password/i).fill(userPassword!);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });
}

test.describe("bill requests saved in the database @affected @database @persistence", () => {
  test("a request held in this browser is adopted once, survives a reload and is not duplicated @affected @database @persistence", async ({
    page,
  }) => {
    test.skip(
      !userEmail || !userPassword,
      "Runner did not supply E2E_USER_EMAIL/E2E_USER_PASSWORD for the signed-in adoption flow",
    );

    const stamp = Date.now();
    const title = `E2E adopted request ${stamp}`;
    const legacyRecord = {
      id: `e2e-legacy-${stamp}`,
      title,
      amountOwed: 23456,
      description: "Disposable record written by the backend adoption verification run.",
      proofFileName: "legacy-bill.png",
      status: "pending",
      submittedAt: "2024-05-01T10:00:00.000Z",
    };

    await page.addInitScript((record) => {
      try {
        window.localStorage.setItem("odogwu.bill-requests.v1", JSON.stringify([record]));
      } catch {
        /* storage unavailable in this context */
      }
    }, legacyRecord);

    await signIn(page);
    await page.goto("/dashboard");

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(title)).toHaveCount(1, { timeout: 20000 });

    await page.reload();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(title)).toHaveCount(1, { timeout: 20000 });

    // The browser copy stays untouched as a recovery backup after a successful move.
    const retained = await page.evaluate(() =>
      window.localStorage.getItem("odogwu.bill-requests.v1"),
    );
    expect(retained).toBeTruthy();
    expect(JSON.parse(retained as string)).toHaveLength(1);
    expect(JSON.parse(retained as string)[0].title).toBe(title);
  });

  test("an interrupted copy stays pending and is retried on reload without duplicating the record @affected @database @persistence", async ({
    page,
  }) => {
    test.skip(
      !userEmail || !userPassword,
      "Runner did not supply E2E_USER_EMAIL/E2E_USER_PASSWORD for the interrupted-copy retry flow",
    );

    const stamp = Date.now();
    const title = `E2E retried request ${stamp}`;
    const legacyRecord = {
      id: `e2e-retry-${stamp}`,
      title,
      amountOwed: 31250,
      description: "Disposable record written by the interrupted-copy verification run.",
      proofFileName: "retry-bill.png",
      status: "pending",
      submittedAt: "2024-06-02T09:30:00.000Z",
    };

    await page.addInitScript((record) => {
      try {
        window.localStorage.setItem("odogwu.bill-requests.v1", JSON.stringify([record]));
      } catch {
        /* storage unavailable in this context */
      }
    }, legacyRecord);

    // Block EVERY write to the table while the copy is meant to be interrupted,
    // otherwise a second concurrent writer would land the row and the "nothing
    // was saved yet" / "retried exactly once" proof would be meaningless.
    let interruptWrites = true;
    await page.route("**/rest/v1/bill_requests**", async (route) => {
      const method = route.request().method();
      if (interruptWrites && (method === "POST" || method === "PATCH")) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await signIn(page);
    await page.goto("/dashboard");

    await expect(page.getByText(title)).toHaveCount(0, { timeout: 20000 });

    interruptWrites = false;
    await page.unroute("**/rest/v1/bill_requests**");

    await page.reload();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(title)).toHaveCount(1, { timeout: 20000 });

    await page.reload();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(title)).toHaveCount(1, { timeout: 20000 });
  });

  test("a request submitted while signed in is stored in the database and reappears after reload @affected @database @persistence", async ({
    page,
  }) => {
    test.skip(
      !userEmail || !userPassword,
      "Runner did not supply E2E_USER_EMAIL/E2E_USER_PASSWORD for the signed-in submission flow",
    );

    const stamp = Date.now();
    const title = `E2E submitted request ${stamp}`;

    await signIn(page);
    await page.goto("/create");

    await page.getByLabel(/title/i).first().fill(title);
    await page.getByLabel(/amount/i).first().fill("18500");

    const description = page.getByLabel(/description/i);
    if ((await description.count()) > 0) {
      await description.first().fill("Disposable record written by the backend adoption verification run.");
    }

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "bill-proof.png",
        mimeType: "image/png",
        buffer: Buffer.from("odogwu-bill-proof"),
      });

    await page.getByRole("button", { name: /submit/i }).first().click();

    await page.goto("/dashboard");

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });

    await page.reload();

    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(title)).toHaveCount(1, { timeout: 20000 });
  });
});
