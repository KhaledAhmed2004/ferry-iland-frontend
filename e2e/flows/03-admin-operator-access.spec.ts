import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { apiAs, API_URL, call, listOf } from "../helpers/api";
import { authFile } from "../helpers/roles";
import { tileWindows } from "../helpers/windows";

/**
 * FLOW 3 — Admin controls operator access (suspend → blocked → activate → back in).
 * Windows (headed): OPERATOR | ADMIN.
 *
 * There is no "pending approval" state in the product: operators are ACTIVE after
 * email OTP, and admins can only Suspend / Activate them. Signup can't be automated
 * (real emailed OTP), so this uses the seeded operator005@elineuque.com — never the
 * shared E2E operator, whose saved session the other flows depend on.
 *
 * Login budget: 3 UI logins (backend allows 5/min/IP) — don't rerun within a minute.
 */
test.describe.configure({ mode: "serial" });

const OPERATOR = {
  email: process.env.E2E_ACCESS_OPERATOR_EMAIL ?? "operator005@elineuque.com",
  password: process.env.E2E_ACCESS_OPERATOR_PASSWORD ?? "Password123!",
  company: process.env.E2E_ACCESS_OPERATOR_COMPANY ?? "Sunrise Marine Services"
};

let adminApi: APIRequestContext;
let providerId: string;

const setStatus = (status: "ACTIVE" | "SUSPENDED") =>
  call(adminApi, "patch", `/providers/${providerId}/status`, { status });

test.beforeAll(async () => {
  adminApi = await apiAs("admin");
  const providers = listOf(
    await call(adminApi, "get", `/providers?searchTerm=${encodeURIComponent(OPERATOR.company)}&limit=10`)
  );
  const provider = providers.find((p) => p.user?.email === OPERATOR.email);
  if (!provider) throw new Error(`${OPERATOR.email} not found — run \`npm run seed:pg\` in backend/.`);
  providerId = provider.id;
  if (provider.user.status !== "ACTIVE") await setStatus("ACTIVE"); // leftover from a crashed run
});

test.afterAll(async () => {
  if (providerId) await setStatus("ACTIVE").catch((e) => console.warn(`cleanup: ${e.message}`));
  await adminApi?.dispose();
});

/** Logs in through the UI and returns the POST /auth/login status. */
async function loginViaUI(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(OPERATOR.email);
  await page.getByPlaceholder("Enter your password").fill(OPERATOR.password);
  const loginResponse = page.waitForResponse(
    (r) => r.url().endsWith("/auth/login") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: /sign in/i }).click();
  return (await loginResponse).status();
}

/** Admin: ticks the operator's row and clicks a bulk action (Suspend / Activate). */
async function adminSetStatus(admin: Page, action: "Suspend" | "Activate") {
  const rowCheckbox = admin.getByRole("checkbox", { name: `Select operator ${OPERATOR.company}` });
  await rowCheckbox.click();
  await expect(rowCheckbox).toBeChecked();
  const statusResponse = admin.waitForResponse(
    (r) => r.url().includes(`/providers/${providerId}/status`) && r.request().method() === "PATCH"
  );
  await admin.getByRole("button", { name: action, exact: true }).click();
  expect((await statusResponse).ok(), `PATCH status → ${action}`).toBe(true);
}

test("admin suspends and reactivates an operator @smoke", async ({ browser, headless }) => {
  const contextOptions = headless
    ? { viewport: { width: 1280, height: 720 } }
    : { viewport: null, deviceScaleFactor: undefined };
  const operatorCtx = await browser.newContext(contextOptions);
  const adminCtx = await browser.newContext({ ...contextOptions, storageState: authFile("admin") });
  const operator = await operatorCtx.newPage();
  const admin = await adminCtx.newPage();
  if (!headless) await tileWindows([operator, admin]);

  const operatorRow = admin.getByRole("row").filter({ hasText: OPERATOR.company });
  let staleToken = "";

  await test.step("Operator: logs in and reaches the dashboard", async () => {
    expect(await loginViaUI(operator)).toBe(200);
    await expect(operator).toHaveURL(/\/dashboard\/operator/, { timeout: 30_000 });
    staleToken = (await operatorCtx.cookies()).find((c) => c.name === "accessToken")?.value ?? "";
    expect(staleToken, "accessToken cookie after login").toBeTruthy();
  });

  await test.step("Admin: finds the operator (Active) and suspends them", async () => {
    await admin.goto("/dashboard/admin/operators");
    // The page clears row selection whenever the (debounced) search changes,
    // so wait for the filtered list request before ticking a checkbox.
    const filtered = admin.waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        r.url().includes("/providers") &&
        decodeURIComponent(r.url().replace(/\+/g, " ")).includes(OPERATOR.company)
    );
    await admin.getByPlaceholder(/search operators/i).fill(OPERATOR.company);
    await filtered;
    await expect(operatorRow).toBeVisible();
    await expect(operatorRow).toContainText(/active/i);

    await adminSetStatus(admin, "Suspend");
    await expect(operatorRow).toContainText(/suspended/i);
  });

  await test.step("Backend: operator's existing session is cut off", async () => {
    // Suspension revokes the operator's sessions and auth middleware checks the DB,
    // so the token issued before suspension must stop working (401: session revoked).
    const res = await operator.request.get(`${API_URL}/operator/overview`, {
      headers: { Authorization: `Bearer ${staleToken}` }
    });
    expect(res.status(), "suspended operator's pre-suspension token should be rejected").toBe(401);
  });

  await test.step("Operator: open dashboard is kicked back to login", async () => {
    await operator.reload();
    await expect(operator).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  await test.step("Operator: fresh login is refused while suspended", async () => {
    await operatorCtx.clearCookies();
    expect(await loginViaUI(operator)).toBe(403);
    await expect(operator).toHaveURL(/\/login/);
  });

  await test.step("Admin: reactivates the operator", async () => {
    await adminSetStatus(admin, "Activate");
    await expect(operatorRow).toContainText(/active/i);
    await expect(operatorRow).not.toContainText(/suspended/i);
  });

  await test.step("Operator: can log in again", async () => {
    expect(await loginViaUI(operator)).toBe(200);
    await expect(operator).toHaveURL(/\/dashboard\/operator/, { timeout: 30_000 });
  });

  await Promise.all([operatorCtx.close(), adminCtx.close()]);
});
