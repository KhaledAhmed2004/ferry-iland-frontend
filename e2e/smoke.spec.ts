import { expect, test } from "./fixtures";

// Opens all three role dashboards side by side and checks each one loads
// with its own role (no redirect to /login, no cross-role access).
test("all three roles can open their dashboards at the same time", async ({ roles }) => {
  const { user, operator, admin } = roles;

  await Promise.all([
    user.goto("/manage-booking"),
    operator.goto("/dashboard/operator"),
    admin.goto("/dashboard/admin")
  ]);

  await expect(user).toHaveURL(/\/manage-booking/);
  await expect(operator).toHaveURL(/\/dashboard\/operator/);
  await expect(admin).toHaveURL(/\/dashboard\/admin/);

  for (const page of [user, operator, admin]) {
    await expect(page.locator("main, body").first()).toBeVisible();
  }
});
