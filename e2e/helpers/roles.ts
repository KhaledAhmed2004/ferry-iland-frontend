import path from "node:path";

export type Role = "user" | "operator" | "admin";

// Defaults = the "Quick Demo" accounts on the login page (LoginForm.tsx).
// Override via env (E2E_USER_EMAIL, E2E_OPERATOR_PASSWORD, ...) if they change.
export const ACCOUNTS: Record<Role, { email: string; password: string; home: RegExp }> = {
  user: {
    email: process.env.E2E_USER_EMAIL ?? "user001@testmail.com",
    password: process.env.E2E_USER_PASSWORD ?? "Password123!",
    home: /\/manage-booking/
  },
  operator: {
    email: process.env.E2E_OPERATOR_EMAIL ?? "khaledahmednayeem.dev@gmail.com",
    password: process.env.E2E_OPERATOR_PASSWORD ?? "Test@123",
    home: /\/dashboard\/operator/
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.E2E_ADMIN_PASSWORD ?? "strong_password_here",
    home: /\/dashboard\/admin/
  }
};

export const authFile = (role: Role) => path.join(__dirname, "..", ".auth", `${role}.json`);
