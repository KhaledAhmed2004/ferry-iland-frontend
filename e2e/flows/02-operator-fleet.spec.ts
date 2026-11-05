import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { apiAs, call, listOf } from "../helpers/api";
import { authFile } from "../helpers/roles";
import { searchFromLanding } from "../helpers/search";

/**
 * FLOW 2 — Operator sets up a sellable trip from scratch, all through the UI:
 * add ferry → add route (free port pair) → schedule a departure →
 * trip shows on the operator's manifest page and in the public customer search.
 *
 * No booking here on purpose: a booked schedule/route can never be deleted, and the
 * operator gets one route per port pair — booking would burn a pair every run.
 * Booking + manifest are covered by flows 01 and 04. Everything created here is deleted.
 */
test.describe.configure({ mode: "serial" });
test.use({ storageState: authFile("operator") });

// 1x1 transparent PNG — the cover-photo uploader converts it to a data URL in the browser.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

interface Port {
  id: string;
  name: string;
}

let operatorApi: APIRequestContext;
let from: Port;
let to: Port;
const created: { ferryId?: string; routeId?: string; scheduleId?: string } = {};

/** First ordered port pair this operator has no route for (routes are unique per operator + pair). */
async function findFreePortPair(api: APIRequestContext): Promise<[Port, Port]> {
  const ports = listOf<Port>(await call(api, "get", "/ports?limit=100"));
  const routes = listOf(await call(api, "get", "/routes?limit=100"));
  const taken = new Set(
    routes.map((r) => `${r.departurePort?.id ?? r.departurePortId}>${r.destinationPort?.id ?? r.destinationPortId}`)
  );
  for (const a of ports) {
    for (const b of ports) {
      if (a.id !== b.id && !taken.has(`${a.id}>${b.id}`)) return [a, b];
    }
  }
  throw new Error(`Operator already has routes for all ${ports.length} ports' pairs — delete an unused route.`);
}

/** Opens a ReusableSelect (Radix) by its placeholder text and picks an option. */
async function pick(page: Page, placeholder: string, option: string | RegExp) {
  await page.getByRole("dialog").getByRole("combobox").filter({ hasText: placeholder }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Clicks submit and returns `data` from the matching POST response (expects 201). */
async function submitAndCapture(page: Page, button: RegExp, path: string) {
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname.endsWith(path) && r.request().method() === "POST"
  );
  await page.getByRole("dialog").getByRole("button", { name: button }).click();
  const res = await response;
  const json = await res.json();
  expect(res.status(), `POST ${path}: ${json?.message}`).toBe(201);
  await expect(page.getByRole("dialog")).toBeHidden();
  return json.data;
}

test.beforeAll(async () => {
  operatorApi = await apiAs("operator");
  [from, to] = await findFreePortPair(operatorApi);
});

test.afterAll(async () => {
  // Order matters: schedule → route → ferry. No bookings exist, so all three really delete.
  const del = (path: string) => call(operatorApi, "delete", path).catch((e) => console.warn(`cleanup: ${e.message}`));
  if (created.scheduleId) await del(`/schedules/${created.scheduleId}`);
  if (created.routeId) await del(`/routes/${created.routeId}`);
  if (created.ferryId) await del(`/ferries/${created.ferryId}`);
  await operatorApi?.dispose();
});

test("operator adds ferry, route and schedule; trip becomes searchable @smoke", async ({ page }) => {
  const stamp = Date.now().toString().slice(-7);
  const ferryName = `E2E Ferry ${stamp}`;
  const capacity = 40;

  // ~30–59 days out at 12:00 local, so the local and UTC calendar dates match for search.
  const dep = new Date();
  dep.setDate(dep.getDate() + 30 + Math.floor(Math.random() * 30));
  dep.setHours(12, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const depDate = `${dep.getFullYear()}-${pad(dep.getMonth() + 1)}-${pad(dep.getDate())}`;

  await test.step("1. Add a ferry", async () => {
    await page.goto("/dashboard/operator/ferries");
    await page.getByRole("button", { name: /add ferry/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /add new ferry/i })).toBeVisible();
    await dialog.getByLabel(/ferry name/i).fill(ferryName);
    await dialog.getByLabel(/passenger capacity/i).fill(String(capacity));

    const ferry = await submitAndCapture(page, /^add ferry$/i, "/ferries");
    created.ferryId = ferry.id;
    await expect(page.getByText(ferryName).first()).toBeVisible();
  });

  await test.step(`2. Add a route (${from.name} → ${to.name})`, async () => {
    await page.goto("/dashboard/operator/routes");
    await page.getByRole("button", { name: /add route/i }).click();

    const dialog = page.getByRole("dialog");
    await pick(page, "Select departure port...", from.name);
    await pick(page, "Select arrival port...", to.name);
    await dialog.getByLabel(/estimated travel time/i).fill("45");
    await dialog.getByLabel(/route description/i).fill(`E2E route ${stamp}`);
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: TINY_PNG
    });

    const route = await submitAndCapture(page, /create route/i, "/routes");
    created.routeId = route.id;
  });

  await test.step("3. Schedule a departure on that route with the new ferry", async () => {
    await page.goto("/dashboard/operator/schedules");
    await page.getByRole("button", { name: /add schedule/i }).click();

    const dialog = page.getByRole("dialog");
    await pick(page, "Select ferry route...", new RegExp(`^${from.name} ➔ ${to.name}`));
    await pick(page, "Select ferry...", new RegExp(`^${ferryName}`));
    // Departure auto-fills arrival from the route's 45-minute duration.
    await dialog.getByLabel(/departure time/i).fill(`${depDate}T12:00`);
    await expect(dialog.getByLabel(/arrival time/i)).toHaveValue(`${depDate}T12:45`);
    await dialog.getByLabel(/adult ticket price/i).fill("35");

    const schedule = await submitAndCapture(page, /schedule departure/i, "/schedules");
    created.scheduleId = schedule.id;
  });

  await test.step("4. Manifest page opens the new trip with 0 passengers", async () => {
    await page.goto(`/dashboard/operator/manifest?tripId=${created.scheduleId}`);
    await expect(page.getByRole("heading", { name: /passenger manifest/i })).toBeVisible();
    await expect(page.getByText(ferryName).first()).toBeVisible();
    await expect(page.getByText(/0 Boarded/i).first()).toBeVisible();
  });

  await test.step("5. Customer search finds the trip", async () => {
    await page.goto("/");
    await searchFromLanding(page, { fromPort: from.name, toPort: to.name, departureDate: depDate });
    await expect(page.locator(`a[href*="/book/${created.scheduleId}/review"]`)).toBeVisible();
  });

  await test.step("6. Backend: schedule saved with ferry capacity as seats", async () => {
    const schedule = await call(operatorApi, "get", `/schedules/${created.scheduleId}`);
    expect(schedule.ferryId ?? schedule.ferry?.id).toBe(created.ferryId);
    expect(schedule.routeId ?? schedule.route?.id).toBe(created.routeId);
    expect(schedule.availableSeats).toBe(capacity);
  });
});
