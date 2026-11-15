// Real browser flow for the sign-in page's "Forgot password?" entry point and
// the /forgot-password route shell it opens.
import { test, expect } from "@playwright/test";

test("forgot password route renders and validates the email with a neutral reset confirmation @affected", async ({
  page,
}) => {
  // Watch the real recovery endpoint so invalid input can be proven to write nothing.
  const recoverCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/recover")) recoverCalls.push(request.url());
  });

  // 0. The route shell is registered: a direct deep link renders the page
  //    instead of bouncing somewhere else.
  await page.goto("/forgot-password");
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Forgot password?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();

  // 1. The entry point also lives on the sign-in page, directly below Password.
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  const loginEmail = page.getByLabel("Email", { exact: true });
  const loginPassword = page.getByLabel("Password", { exact: true });
  const forgotLink = page.getByRole("link", { name: "Forgot password?" });

  await expect(loginEmail).toBeVisible();
  await expect(loginPassword).toBeVisible();
  await expect(forgotLink).toBeVisible();

  const passwordBox = await loginPassword.boundingBox();
  const linkBox = await forgotLink.boundingBox();
  expect(passwordBox, "password field needs a layout box").not.toBeNull();
  expect(linkBox, "forgot link needs a layout box").not.toBeNull();
  const gap = linkBox!.y - (passwordBox!.y + passwordBox!.height);
  expect(gap).toBeGreaterThanOrEqual(-1);
  expect(gap).toBeLessThan(80);

  // 2. Clicking it opens /forgot-password and carries the typed address over.
  await loginEmail.fill("donor@example.com");
  await forgotLink.click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Forgot password?" }),
  ).toBeVisible();

  const email = page.getByLabel("Email", { exact: true });
  await expect(email).toHaveValue("donor@example.com");

  const submit = page.getByRole("button", { name: "Send reset link" });
  await expect(submit).toBeVisible();

  // 3. Empty submit: visible validation, and no request leaves the browser.
  await email.fill("");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("Enter a valid email address.");
  await expect(page.getByTestId("forgot-confirmation")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(recoverCalls).toHaveLength(0);

  // 4. Malformed address: same validation, still nothing written.
  await email.fill("not-an-email");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("Enter a valid email address.");
  await expect(page.getByTestId("forgot-confirmation")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(recoverCalls).toHaveLength(0);

  // 5. Correcting the address sends the real request and shows the neutral copy.
  await email.fill("donor@example.com");
  await submit.click();
  await expect(page.getByTestId("forgot-confirmation")).toHaveText(
    "Check your inbox for a password reset link.",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  // The neutral sentence stays verbatim above; the addressed mailbox is shown
  // beside it, so the confirmation names the address the link was sent to.
  await expect(page.getByTestId("forgot-confirmation-email")).toContainText(
    "donor@example.com",
  );
  expect(recoverCalls.length).toBeGreaterThan(0);
});
