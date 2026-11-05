import { expect, test, type Page } from "@playwright/test";

import { searchFromLanding } from "./search";
import type { TestTrip } from "./trip";

export interface UiBooking {
  id: string;
  reference: string;
}

/**
 * Customer journey through the UI: landing search → results → review →
 * passengers → payment → confirmation. Returns the booking created by POST /bookings.
 * `page` must be logged in as a user.
 */
export async function bookTripViaUI(page: Page, trip: TestTrip, passengerName: string): Promise<UiBooking> {
  let booking: UiBooking = { id: "", reference: "" };

  await test.step("Landing page: pick From / To / Date and search", async () => {
    await page.goto("/");
    await searchFromLanding(page, trip);
    await expect(page).toHaveURL(/\/ferries\?/);
    await expect(page).toHaveURL(new RegExp(`departureDate=${trip.departureDate}`));
  });

  await test.step("Search results show the trip", async () => {
    const selectTrip = page.locator(`a[href*="/book/${trip.scheduleId}/review"]`);
    await expect(selectTrip, "trip should appear in search results").toBeVisible();
    await selectTrip.click();
  });

  await test.step("Review trip", async () => {
    await expect(page).toHaveURL(new RegExp(`/book/${trip.scheduleId}/review`));
    await page.getByRole("button", { name: /continue to passenger details/i }).click();
  });

  await test.step("Fill passenger details", async () => {
    await expect(page).toHaveURL(/\/passengers/);
    await page.getByPlaceholder("e.g. Mohamed Solih").first().fill(passengerName);
    await page.getByRole("button", { name: /continue to payment/i }).click();
  });

  await test.step("Continue to pay (POST /bookings → 201)", async () => {
    await expect(page).toHaveURL(/\/payment/);
    const bookingResponse = page.waitForResponse(
      (r) => r.url().endsWith("/bookings") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /continue to pay/i }).click();

    const res = await bookingResponse;
    expect(res.status(), "POST /bookings should succeed").toBe(201);
    const data = (await res.json()).data;
    booking = { id: data.id, reference: data.reference };
    expect(booking.reference).toBeTruthy();
    // This helper covers the confirm on create flow (backend PAYMENTS_ENABLED off). With
    // payments on, the booking waits for a card: use the pay at checkout flow (06) instead.
    expect(data.status, "set PAYMENTS_ENABLED=false on the backend for this flow").toBe("CONFIRMED");
  });

  await test.step("Confirmation shows the real reference + passenger", async () => {
    await expect(page).toHaveURL(new RegExp(`/confirmation\\?ref=${booking.reference}`));
    await expect(page.getByText(booking.reference).first()).toBeVisible();
    await expect(page.getByText(passengerName).first()).toBeVisible();
  });

  return booking;
}
