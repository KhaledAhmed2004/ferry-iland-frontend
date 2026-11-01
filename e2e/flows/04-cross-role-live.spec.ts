import type { APIRequestContext } from "@playwright/test";

import { expect, test } from "../fixtures";
import { apiAs, call } from "../helpers/api";
import { bookTripViaUI } from "../helpers/booking";
import { cleanupTestTrip, createTestTrip, type TestTrip } from "../helpers/trip";

/**
 * FLOW 4 — Three roles at once (watch it: npm run e2e:watch -- flows/04)
 * Windows tile left → right: USER | OPERATOR | ADMIN.
 *
 *   operator: opens the empty manifest for a fresh trip
 *   user:     books that trip through the UI
 *   operator: manifest now lists the passenger → confirms boarding
 *   admin:    finds the booking by reference in the admin bookings list
 *   backend:  ticket is BOARDED, one seat taken
 *
 * Note: the frontend has no socket client yet, so the operator's manifest
 * only updates on reload / refocus — this test reloads explicitly.
 */
test.describe.configure({ mode: "serial" });

let operatorApi: APIRequestContext;
let userApi: APIRequestContext;
let trip: TestTrip;
const bookingIds: string[] = [];

test.beforeAll(async () => {
  operatorApi = await apiAs("operator");
  userApi = await apiAs("user");
  trip = await createTestTrip(operatorApi);
});

test.afterAll(async () => {
  if (trip) await cleanupTestTrip(operatorApi, userApi, trip.scheduleId, bookingIds);
  await operatorApi?.dispose();
  await userApi?.dispose();
});

test("user books, operator boards, admin sees it @smoke", async ({ roles }) => {
  const { user, operator, admin } = roles;
  const passengerName = `E2E Live ${Date.now()}`;
  const manifestUrl = `/dashboard/operator/manifest?tripId=${trip.scheduleId}`;
  const passengerRow = operator.getByRole("row").filter({ hasText: passengerName });

  await test.step("Operator: manifest for the new trip has no such passenger yet", async () => {
    await operator.goto(manifestUrl);
    await expect(operator.getByRole("heading", { name: /passenger manifest/i })).toBeVisible();
    await expect(passengerRow).toHaveCount(0);
  });

  const booking = await test.step("User: books the trip", () => bookTripViaUI(user, trip, passengerName));
  bookingIds.push(booking.id);

  await test.step("Operator: reload → passenger appears on manifest", async () => {
    await operator.reload();
    await expect(passengerRow).toBeVisible();
    await expect(passengerRow).toContainText(booking.reference);
  });

  await test.step("Operator: confirms boarding", async () => {
    const boardResponse = operator.waitForResponse(
      (r) => /\/operator\/manifest\/[^/]+\/board/.test(r.url()) && r.request().method() === "PATCH"
    );
    await passengerRow.getByRole("button", { name: /confirm boarded/i }).click();
    expect((await boardResponse).ok(), "PATCH board should succeed").toBe(true);
    await expect(passengerRow.getByRole("button", { name: /undo boarding/i })).toBeVisible();
  });

  await test.step("Admin: finds the booking by reference", async () => {
    await admin.goto(`/dashboard/admin/bookings?ref=${booking.reference}`);
    await expect(admin.getByText(booking.reference).first()).toBeVisible();
  });

  await test.step("Backend: ticket BOARDED, one seat taken", async () => {
    const manifest = await call(operatorApi, "get", `/operator/manifest?tripId=${trip.scheduleId}`);
    const record = manifest.passengers.find((p: { passengerName: string }) => p.passengerName === passengerName);
    expect(record?.boardingStatus).toBe("BOARDED");

    const schedule = await call(operatorApi, "get", `/schedules/${trip.scheduleId}`);
    expect(schedule.availableSeats).toBe(trip.seats - 1);
  });
});
