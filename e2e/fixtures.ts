import { test as base, type Page } from "@playwright/test";

import { authFile, type Role } from "./helpers/roles";

type RolePages = Record<Role, Page>;

// `roles` fixture: three separate logged-in windows (user, operator, admin)
// inside one test, so cross-role flows can be checked at the same time.
export const test = base.extend<{ roles: RolePages }>({
  roles: async ({ browser }, use) => {
    const entries = await Promise.all(
      (["user", "operator", "admin"] as Role[]).map(async (role) => {
        const ctx = await browser.newContext({ storageState: authFile(role) });
        return [role, await ctx.newPage()] as const;
      })
    );
    const pages = Object.fromEntries(entries) as RolePages;

    await use(pages);

    await Promise.all(Object.values(pages).map((p) => p.context().close()));
  }
});

export { expect } from "@playwright/test";
