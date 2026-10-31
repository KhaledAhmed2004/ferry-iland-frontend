import fs from "node:fs";

import { request, type APIRequestContext } from "@playwright/test";

import { authFile, type Role } from "./roles";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:5000/api/v1";

/** Reads the accessToken cookie saved by auth.setup.ts for a role. */
export function tokenFor(role: Role): string {
  const state = JSON.parse(fs.readFileSync(authFile(role), "utf8"));
  const cookie = state.cookies.find((c: { name: string }) => c.name === "accessToken");
  if (!cookie) throw new Error(`No accessToken saved for ${role}. Run with E2E_FRESH_LOGIN=1.`);
  return cookie.value;
}

/** API client logged in as a role (Bearer token from the saved login). */
export async function apiAs(role: Role): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: `${API_URL}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${tokenFor(role)}` }
  });
}

/** GET/POST/PATCH and unwrap `{ success, data }`, failing loudly with the backend message. */
export async function call<T = any>(
  api: APIRequestContext,
  method: "get" | "post" | "patch" | "delete",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await api[method](path.replace(/^\//, ""), body === undefined ? {} : { data: body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok()) {
    throw new Error(`${method.toUpperCase()} ${path} → ${res.status()}: ${json?.message ?? "no message"}`);
  }
  return json.data as T;
}

/** Backend list endpoints wrap arrays differently (data / items / routes / ...). */
export function listOf<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  for (const key of ["data", "items", "routes", "ferries", "schedules", "bookings", "results"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}
