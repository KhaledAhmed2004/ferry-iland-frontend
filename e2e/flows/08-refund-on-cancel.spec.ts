import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, apiAs, call, listOf } from "../helpers/api";
import { authFile } from "../helpers/roles";

/**
 * FLOW 8: Refund on cancel (spec 0004)
 * A. A customer 24h or more ahead cancels on their own from manage booking: the policy line is
 *    shown, the confirm dialog opens, the booking ends CANCELLED and the seats come back. (AC-1,
 *    AC-3, AC-4, AC-18; with payments off the booking is a manual payment, so the button reads
 *    "refund handled by operator" and no card refund is made.)
 * B. Inside 24h the customer cannot cancel on their own: they send a reschedule request with a
 *    preferred trip, the operator resolves it from the Requests tab with that trip preselected,
 *    and the booking moves with its tickets. (AC-2, AC-5, AC-9, AC-15, AC-18)
 *
 * Needs the backend with PAYMENTS_ENABLED off (bookings confirm on create, like flows 01, 04, 05).
 * Creating a request emails the ferry owner operator's account, as the feature does in production.
 */
test.describe.configure({ mode: "serial" });

const HOUR = 3600_000;
const POLICY = "Free cancellation with a full refund until 24 hours before departure.";

let operatorApi: APIRequestContext;
let adminApi: APIRequestContext;
const scheduleIds: string[] = [];
const bookingIds: string[] = [];

/** A bookable trip of the logged in operator leaving about `hours` from now. */
async function createTripIn(hours: number) {
  const routes = listOf(await call(operatorApi, "get", "/routes?limit=100"));
  const route = routes.find((r) => r.status === "ACTIVE");
  if (!route) throw new Error("Operator has no ACTIVE route.");
  const ferries = listOf(await call(operatorApi, "get", "/ferries?limit=100"));
  const ferry = ferries.find((f) => f.status === "IN_SERVICE");
  if (!ferry) throw new Error("Operator has no IN_SERVICE ferry.");

  // The ferry may already sail at a given time: step forward 37 minutes until a slot is free.
  for (let attempt = 0; attempt < 8; attempt++) {
    const dep = new Date(Date.now() + hours * HOUR + attempt * 37 * 60_000);
    dep.setUTCSeconds(0, 0);
    try {
      const schedule = await call(operatorApi, "post", "/schedules", {
        routeId: route.id,
        ferryId: ferry.id,
        departureTime: dep.toISOString(),
        arrivalTime: new Date(dep.getTime() + (route.durationMinutes ?? 60) * 60_000).toISOString(),
        gate: "E2E Gate",
        captain: "E2E Captain",
        adultFare: 40,
        childFare: 20,
        availableSeats: 20
      });
      scheduleIds.push(schedule.id);
      return schedule;
    } catch (e) {
      if (!/blackout|conflict|overlap/i.test((e as Error).message) || attempt === 7) throw e;
    }
  }
}

/** A guest booking for 2 adults; the email is what the customer types to open it. */
async function guestBooking(scheduleId: string) {
  const email = `e2e-refund-${Date.now()}@example.com`;
  const res = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scheduleId,
      leadPassengerName: "Refund Flow",
      leadPassengerEmail: email,
      adultsCount: 2,
      childrenCount: 0,
      passengers: [
        { passengerName: "Refund Flow", nationality: "AI", passportOrId: "RFL1" },
        { passengerName: "Second Rider", nationality: "AI", passportOrId: "RFL2" }
      ]
    })
  });
  const json = await res.json();
  expect(res.status, json.message).toBe(201);
  expect(json.data.status, "run the backend with PAYMENTS_ENABLED off").toBe("CONFIRMED");
  bookingIds.push(json.data.id);
  return { id: json.data.id as string, reference: json.data.reference as string, email };
}

async function openAsGuest(page: Page, booking: { reference: string; email: string }) {
  await page.goto(`/manage-booking/${booking.reference}`);
  await page.locator("#booking-email").fill(booking.email);
  await page.locator("#booking-email").press("Enter");
}

const seatsOf = async (scheduleId: string) =>
  (await call(operatorApi, "get", `/schedules/${scheduleId}`)).availableSeats as number;

test.beforeAll(async () => {
  operatorApi = await apiAs("operator");
  adminApi = await apiAs("admin");
});

test.afterAll(async () => {
  for (const id of bookingIds) await call(adminApi, "patch", `/bookings/${id}/cancel`, {}).catch(() => {});
  for (const id of scheduleIds) {
    await call(operatorApi, "delete", `/schedules/${id}`).catch(() =>
      call(operatorApi, "patch", `/schedules/${id}/status`, { status: "CANCELLED" }).catch(() => {})
    );
  }
  await operatorApi?.dispose();
  await adminApi?.dispose();
});

test("A. 24h or more ahead, the customer cancels on their own and the seats come back (AC-1, AC-3, AC-4, AC-18)", async ({
  browser
}) => {
  const trip = await createTripIn(72);
  const booking = await guestBooking(trip.id);
  expect(await seatsOf(trip.id)).toBe(18);

  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  await test.step("Manage booking shows the policy and a self cancel button", async () => {
    await openAsGuest(page, booking);
    await expect(page.getByText(POLICY)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Cancel booking \(refund handled by operator\)/ })).toBeVisible();
  });

  await test.step("Confirm the cancel in the dialog", async () => {
    await page.getByRole("button", { name: /Cancel booking \(refund handled by operator\)/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Cancel Booking" })).toBeVisible();
    const cancelCall = page.waitForResponse((r) => r.url().includes("/cancel") && r.request().method() === "PATCH");
    await dialog.getByRole("button", { name: "Confirm Cancellation" }).click();
    expect((await cancelCall).status()).toBe(200);
  });

  await test.step("The page and the backend both show it cancelled, seats returned", async () => {
    await expect(page.getByRole("button", { name: /Booking Cancelled/ })).toBeVisible({ timeout: 20_000 });
    const after = await call(adminApi, "get", `/bookings/${booking.reference}`);
    expect(after.status).toBe("CANCELLED");
    expect(after.cancellation.mode).toBe("NONE");
    expect(await seatsOf(trip.id)).toBe(20);
  });
  await ctx.close();
});

test("B. Inside 24h the customer asks to move, the operator moves them to the trip they chose (AC-2, AC-5, AC-9, AC-15, AC-18)", async ({
  browser
}) => {
  const soon = await createTripIn(6);
  const later = await createTripIn(30);
  const booking = await guestBooking(soon.id);
  const ticketsBefore = (await call(adminApi, "get", `/bookings/${booking.reference}`)).tickets
    .map((t: { ticketNumber: string }) => t.ticketNumber)
    .sort();

  const guest = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await guest.newPage();

  await test.step("No self cancel inside 24h, only a request", async () => {
    await openAsGuest(page, booking);
    await expect(page.getByRole("button", { name: /Request cancellation \/ reschedule/ })).toBeVisible({
      timeout: 20_000
    });
    await expect(page.getByRole("button", { name: /Cancel booking|Cancel & get/ })).toHaveCount(0);
  });

  await test.step("Send a reschedule request with the later trip as the preferred one", async () => {
    await page.getByRole("button", { name: /Request cancellation \/ reschedule/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Move to another trip").click();
    const picker = dialog.locator("fieldset", { hasText: "Preferred outbound trip" });
    await expect(picker.getByText("No preference")).toBeVisible();
    const options = await call(adminApi, "get", `/bookings/${booking.reference}/move-options`);
    const index = options.findIndex((o: { scheduleId: string }) => o.scheduleId === later.id);
    expect(index, "the later trip is a valid move option").toBeGreaterThanOrEqual(0);
    // The first radio is "No preference".
    await picker.getByRole("radio").nth(index + 1).check();
    await dialog.locator("textarea").fill("Please move me to the later sailing.");
    await dialog.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Request pending")).toBeVisible({ timeout: 20_000 });
  });

  const ctx = await browser.newContext({ storageState: authFile("operator") });
  const op = await ctx.newPage();

  await test.step("The operator resolves it from the Requests tab with the customer's trip preselected", async () => {
    await op.goto("/dashboard/operator/bookings");
    await op.getByRole("tab", { name: /Requests/ }).click();
    await op.getByRole("row").filter({ hasText: booking.reference }).getByRole("button", { name: "Resolve" }).click();
    const dialog = op.getByRole("dialog");
    await expect(dialog.getByText("Customer's choice")).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByRole("radio", { name: /Move to another trip/ })).toBeChecked();
    const resolveCall = op.waitForResponse((r) => r.url().includes("/resolve"));
    await dialog.getByRole("button", { name: "Move booking" }).click();
    expect((await resolveCall).status()).toBe(200);
    await expect(op.getByText("Booking moved").first()).toBeVisible();
  });
  await ctx.close();

  await test.step("The booking now sits on the later trip with the same tickets", async () => {
    const after = await call(adminApi, "get", `/bookings/${booking.reference}`);
    expect(after.scheduleId).toBe(later.id);
    expect(after.tickets.map((t: { ticketNumber: string }) => t.ticketNumber).sort()).toEqual(ticketsBefore);
    expect(after.cancellation.lastResolvedRequest.status).toBe("RESCHEDULED");
    expect(await seatsOf(soon.id)).toBe(20);
    expect(await seatsOf(later.id)).toBe(18);
  });

  await test.step("The customer sees the answer on their booking", async () => {
    await page.reload();
    await page.locator("#booking-email").fill(booking.email).catch(() => {});
    await page.locator("#booking-email").press("Enter").catch(() => {});
    await expect(page.getByText("Moved to another trip")).toBeVisible({ timeout: 20_000 });
  });
  await guest.close();
});
