import { expect, test } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

test("@affected @database @persistence Odogwu saves leaderboard privacy and shows it after reload", async ({ page, request }) => {
  test.setTimeout(90_000);

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const backend = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  // Legacy save checks do not prepare account fixtures; the sandbox full run
  // does, and treats this same skip as missing required setup if it does not.
  test.skip(!email || !password || !backend || !key, "Backend configuration not provided to the runner");

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);

  const toggle = page.getByTestId("leaderboard-privacy-switch");
  await expect(toggle).toBeEnabled({ timeout: 30_000 });
  const original = await toggle.isChecked();
  const saved = !original;
  const write = page.waitForResponse((response) =>
    response.url().includes("/rest/v1/giver_profiles") &&
    ["POST", "PATCH"].includes(response.request().method())
  );
  await toggle.click();
  expect((await write).ok(), "the leaderboard privacy write must succeed").toBeTruthy();
  await expect(toggle).toBeChecked({ checked: saved });
  await expect(toggle).toBeEnabled();

  await page.reload({ waitUntil: "load" });
  await expect(toggle).toBeEnabled({ timeout: 30_000 });
  await expect(toggle).toBeChecked({ checked: saved });
  if (saved) {
    await expect(page.getByText("Show my name on the leaderboard", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByTestId("leaderboard-anonymous-note")).toContainText("Anonymous giver");
  }

  // Independently read the exact disposable owner's row after the full reload.
  const auth = await request.post(`${backend}/auth/v1/token?grant_type=password`, {
    headers: { apikey: key! },
    data: { email, password },
  });
  expect(auth.ok(), "disposable account readback sign-in").toBeTruthy();
  const session = await auth.json();
  const stored = await request.get(
    `${backend}/rest/v1/giver_profiles?select=is_anonymous&user_id=eq.${encodeURIComponent(session.user.id)}`,
    { headers: { apikey: key!, Authorization: `Bearer ${session.access_token}` } },
  );
  expect(stored.ok(), "owner-scoped backend readback").toBeTruthy();
  expect(await stored.json()).toEqual([{ is_anonymous: !saved }]);
});
