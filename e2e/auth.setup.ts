import fs from "node:fs";

import { expect, test as setup } from "@playwright/test";

import { ACCOUNTS, authFile, type Role } from "./helpers/roles";

// Backend allows only 5 logins/min per IP and JWTs last 7 days,
// so reuse a saved login if it is younger than this. E2E_FRESH_LOGIN=1 forces a new one.
const REUSE_MS = 12 * 60 * 60 * 1000;

const isFresh = (file: string) =>
  !process.env.E2E_FRESH_LOGIN &&
  fs.existsSync(file) &&
  Date.now() - fs.statSync(file).mtimeMs < REUSE_MS;

// Logs in once per role and saves cookies to e2e/.auth/<role>.json.
// Every other test starts already logged in from these files.
for (const role of Object.keys(ACCOUNTS) as Role[]) {
  setup(`login as ${role}`, async ({ page }) => {
    const file = authFile(role);
    if (isFresh(file)) return;

    const { email, password, home } = ACCOUNTS[role];

    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(home, { timeout: 30_000 });
    await page.context().storageState({ path: file });
  });
}
