import { expect, test, type APIRequestContext } from "@playwright/test";

import { apiAs, call } from "../helpers/api";
import { bookTripViaUI } from "../helpers/booking";
import { authFile } from "../helpers/roles";
import { cleanupTestTrip, createTestTrip, type TestTrip } from "../helpers/trip";

/**
 * FLOW 1 — Customer books a ferry
 * landing page search → results → review → passengers → payment → confirmation → boarding pass
 * Then checks the backend: booking saved, seat count went down by 1.
 */
test.describe.configure({ mode: "serial" });
test.use({ storageState: authFile("user") });

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

test("customer books a trip and gets a boarding pass @smoke", async ({ page }) => {
  const passengerName = `E2E Passenger ${Date.now()}`;

  const booking = await bookTripViaUI(page, trip, passengerName);
  bookingIds.push(booking.id);

  await test.step("Boarding pass opens", async () => {
    await page.getByRole("link", { name: /view digital boarding pass/i }).click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${booking.reference}`));
    await expect(page.getByText(passengerName).first()).toBeVisible();
  });

  await test.step("Backend: one seat taken", async () => {
    const schedule = await call(operatorApi, "get", `/schedules/${trip.scheduleId}`);
    expect(schedule.availableSeats).toBe(trip.seats - 1);
  });
});
