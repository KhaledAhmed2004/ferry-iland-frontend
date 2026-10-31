import { expect, test, type APIRequestContext } from "@playwright/test";

import { apiAs, call } from "../helpers/api";
import { authFile } from "../helpers/roles";
import { searchFromLanding } from "../helpers/search";
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

test("customer books a trip and gets a boarding pass", async ({ page }) => {
  const passengerName = `E2E Passenger ${Date.now()}`;

  let ref = "";

  await test.step("1. Landing page: pick From / To / Date and search", async () => {
    await page.goto("/");
    await searchFromLanding(page, trip);
    await expect(page).toHaveURL(/\/ferries\?/);
    await expect(page).toHaveURL(new RegExp(`departureDate=${trip.departureDate}`));
  });

  await test.step("2. Search results show the new trip", async () => {
    const selectTrip = page.locator(`a[href*="/book/${trip.scheduleId}/review"]`);
    await expect(selectTrip, "new trip should appear in search results").toBeVisible();
    await selectTrip.click();
  });

  await test.step("3. Review trip", async () => {
    await expect(page).toHaveURL(new RegExp(`/book/${trip.scheduleId}/review`));
    await page.getByRole("button", { name: /continue to passenger details/i }).click();
  });

  await test.step("4. Fill passenger details", async () => {
    await expect(page).toHaveURL(/\/passengers/);
    await page.getByPlaceholder("e.g. Mohamed Solih").first().fill(passengerName);
    await page.getByRole("button", { name: /continue to payment/i }).click();
  });

  await test.step("5. Pay & confirm (POST /bookings → 201)", async () => {
    await expect(page).toHaveURL(/\/payment/);
    const bookingResponse = page.waitForResponse(
      (r) => r.url().endsWith("/bookings") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /confirm booking/i }).click();

    const res = await bookingResponse;
    expect(res.status(), "POST /bookings should succeed").toBe(201);
    const booking = (await res.json()).data;
    bookingIds.push(booking.id);
    ref = booking.reference;
    expect(ref).toBeTruthy();
  });

  await test.step("6. Confirmation shows the real reference + passenger", async () => {
    await expect(page).toHaveURL(new RegExp(`/confirmation\\?ref=${ref}`));
    await expect(page.getByText(ref).first()).toBeVisible();
    await expect(page.getByText(passengerName).first()).toBeVisible();
  });

  await test.step("7. Boarding pass opens", async () => {
    await page.getByRole("link", { name: /view digital boarding pass/i }).click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${ref}`));
    await expect(page.getByText(passengerName).first()).toBeVisible();
  });

  await test.step("8. Backend: one seat taken", async () => {
    const schedule = await call(operatorApi, "get", `/schedules/${trip.scheduleId}`);
    expect(schedule.availableSeats).toBe(trip.seats - 1);
  });
});
