import { expect, test, type APIRequestContext } from "@playwright/test";

import { API_URL, apiAs, call } from "../helpers/api";
import { bookTripViaUI } from "../helpers/booking";
import { ACCOUNTS, authFile } from "../helpers/roles";
import { cleanupTestTrip, createTestTrip, type TestTrip } from "../helpers/trip";

/**
 * FLOW 5 — Customer self-service (signed in)
 * book via UI → booking shows under My Bookings (/manage-booking) → digital pass opens
 * → cancel from the table → status CANCELLED, seat returned on the backend.
 * Guards bug #2: a booking made while signed in must belong to that account.
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

test("log out revokes the session on the server, not only in the browser", async ({ browser }) => {
  // Own login (not the shared saved one) so logging out doesn't break the other specs.
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  const { email, password, home } = ACCOUNTS.user;

  await test.step("Log in through the UI", async () => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(home, { timeout: 30_000 });
  });
  const token = (await ctx.cookies()).find((c) => c.name === "accessToken")?.value;
  expect(token, "login should store an access token").toBeTruthy();

  await test.step("Log out (POST /auth/logout → 200)", async () => {
    const logoutCall = page.waitForResponse(
      (r) => r.url().endsWith("/auth/logout") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Log Out" }).first().click();
    expect((await logoutCall).status()).toBe(200);
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step("Backend: the old token is rejected", async () => {
    const res = await page.request.get(`${API_URL}/bookings/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status(), "token must stop working after logout").toBe(401);
  });

  await ctx.close();
});

test("signed-in customer sees the booking in My Bookings and cancels it", async ({ page }) => {
  const passengerName = `E2E Self Service ${Date.now()}`;
  const booking = await bookTripViaUI(page, trip, passengerName);
  bookingIds.push(booking.id);

  const row = page.getByRole("row").filter({ hasText: booking.reference });

  await test.step("My Bookings lists the new booking as CONFIRMED", async () => {
    await page.goto("/manage-booking");
    await page.getByPlaceholder("Search reference, island, ferry...").fill(booking.reference);
    await expect(row, "booking made while signed in should be in My Bookings").toBeVisible();
    await expect(row.getByText("CONFIRMED")).toBeVisible();
  });

  await test.step("Digital pass opens from the row", async () => {
    await row.getByRole("link", { name: "Digital Pass" }).click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${booking.reference}`));
    await expect(page.getByText(passengerName).first()).toBeVisible();
    await page.goBack();
    await expect(row).toBeVisible();
  });

  await test.step("Cancel from the table (PATCH /bookings/:id/cancel → 200)", async () => {
    await row.getByRole("button", { name: "Cancel Booking" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(booking.reference)).toBeVisible();

    const cancelResponse = page.waitForResponse(
      (r) => r.url().includes(`/bookings/${booking.id}/cancel`) && r.request().method() === "PATCH"
    );
    await dialog.getByRole("button", { name: /confirm cancellation/i }).click();
    expect((await cancelResponse).status(), "cancel should succeed").toBe(200);

    await expect(dialog).toBeHidden();
    await expect(row.getByText("CANCELLED")).toBeVisible();
    await expect(row.getByRole("button", { name: "Cancel Booking" })).toBeDisabled();
  });

  await test.step("Backend: booking CANCELLED on the account, seat returned", async () => {
    const mine = await call<any[]>(userApi, "get", "/bookings/my");
    const saved = mine.find((b) => b.id === booking.id);
    expect(saved, "booking should belong to the signed-in user").toBeTruthy();
    expect(saved.status).toBe("CANCELLED");

    const schedule = await call(operatorApi, "get", `/schedules/${trip.scheduleId}`);
    expect(schedule.availableSeats).toBe(trip.seats);
  });
});
