import { test as base, type Page } from "@playwright/test";

import { authFile, type Role } from "./helpers/roles";
import { tileWindows } from "./helpers/windows";

type RolePages = Record<Role, Page>;

const ORDER: Role[] = ["user", "operator", "admin"];

// `roles` fixture: three separate logged-in windows (user, operator, admin)
// inside one test, so cross-role flows can be checked at the same time.
// Headed runs (npm run e2e:watch / e2e:headed) tile them left → right: user | operator | admin.
export const test = base.extend<{ roles: RolePages }>({
  roles: async ({ browser, headless }, use) => {
    const entries = await Promise.all(
      ORDER.map(async (role) => {
        const ctx = await browser.newContext({
          storageState: authFile(role),
          // Headed: let each page fill its tiled window. Headless: same 1280x720 as other tests.
          ...(headless
            ? { viewport: { width: 1280, height: 720 } }
            : { viewport: null, deviceScaleFactor: undefined }) // device preset's scale factor can't combine with null viewport
        });
        return [role, await ctx.newPage()] as const;
      })
    );
    const pages = Object.fromEntries(entries) as RolePages;

    if (!headless) await tileWindows(ORDER.map((r) => pages[r]));

    await use(pages);

    await Promise.all(Object.values(pages).map((p) => p.context().close()));
  }
});

export { expect } from "@playwright/test";
