import path from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import type { IBookingDetail, ITripSearchResponse } from "../../src/types/models";
import { apiAs, call } from "../helpers/api";
import { authFile } from "../helpers/roles";

/**
 * FLOW 7 — Round Trip and Same Day Return
 * results page → pick trip type → select outbound → select return → review → passengers → pay
 * Then checks the backend: trip type, return ferry and bundle price saved, seats taken on both ferries.
 *
 * Uses the seeded client routes (Makana runs Saba <-> Statia both ways, client fare matrix):
 * Saba -> Statia round trip $103 / adult, same day return $94 / adult.
 * Screenshots go to E2E_SHOTS_DIR (or the test output folder) and into the HTML report.
 */
test.describe.configure({ mode: "serial" });
test.use({ storageState: authFile("user") });

const FROM = "Fort Bay Harbor, Saba";
const TO = "Gallows Bay, Sint Eustatius";
const ADULTS = 2;

type Kind = "same-day-return" | "round-trip";

interface Plan {
  departureDate: string;
  returnDate: string;
  outboundIndex: number;
  outboundId: string;
  returnIndex: number;
  returnId: string;
  farePerAdult: number;
}

let userApi: APIRequestContext;
const bookingIds: string[] = [];

/** YYYY-MM-DD, `days` from today (UTC), skipping Sunday (fewer sailings). */
const dayFromNow = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** Finds, through the search API, an outbound + return pair the UI will offer (same rules). */
async function planTrip(kind: Kind, departureDate: string, returnDate: string): Promise<Plan> {
  const params = new URLSearchParams({
    from: FROM,
    to: TO,
    departureDate,
    tripType: kind,
    adults: String(ADULTS),
    children: "0",
    limit: "20"
  });
  if (kind === "round-trip") params.set("returnDate", returnDate);
  const search = await call<ITripSearchResponse>(userApi, "get", `/trips/search?${params}`);

  for (const [outboundIndex, out] of search.outboundTrips.entries()) {
    if (!out.fareQuote?.available) continue;
    const valid = search.returnTrips.filter(
      (r) =>
        r.operatorId === out.operatorId &&
        new Date(r.departureAt).getTime() >= new Date(out.arrivalAt).getTime()
    );
    if (valid.length > 0) {
      return {
        departureDate,
        returnDate,
        outboundIndex,
        outboundId: out.tripId,
        returnIndex: 0,
        returnId: valid[0].tripId,
        farePerAdult: out.fareQuote.pricePerAdult ?? 0
      };
    }
  }
  throw new Error(`No ${kind} outbound + return pair on ${departureDate}. Run npm run seed:pg in backend.`);
}

async function shot(page: Page, name: string) {
  const dir = process.env.E2E_SHOTS_DIR ?? test.info().outputPath();
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await test.info().attach(name, { path: file, contentType: "image/png" });
}

const seatsOf = async (scheduleId: string) =>
  (await call(userApi, "get", `/trips/${scheduleId}`)).availableSeats as number;

async function bookReturnTrip(page: Page, kind: Kind, plan: Plan, prefix: string) {
  const label = kind === "same-day-return" ? "Same Day Return" : "Round Trip";
  const seatsBefore = { out: await seatsOf(plan.outboundId), back: await seatsOf(plan.returnId) };
  let booking: IBookingDetail = {} as IBookingDetail;

  await test.step("1. Results page: choose the trip type", async () => {
    const query = new URLSearchParams({
      from: FROM,
      to: TO,
      departureDate: plan.departureDate,
      adults: String(ADULTS),
      children: "0",
      passengers: `${ADULTS} Passengers`
    });
    await page.goto(`/ferries?${query}`);
    await page.getByRole("button", { name: kind === "same-day-return" ? "Same day return" : "Round trip" }).click();
    if (kind === "round-trip") {
      // The filter bar fills a default return date; point it at the planned one.
      await page.goto(`/ferries?${query}&tripType=round-trip&returnDate=${plan.returnDate}`);
    }
    await expect(page).toHaveURL(new RegExp(`tripType=${kind}`));
    await expect(page.getByRole("region", { name: "Outbound ferries" })).toBeVisible();
    await shot(page, `${prefix}-1-results`);
  });

  await test.step("2. Select the outbound ferry, then a return ferry", async () => {
    const outbound = page.getByRole("region", { name: "Outbound ferries" });
    await expect(outbound.getByText(`${label.toLowerCase()} / per adult`).first()).toBeVisible();
    await outbound.getByRole("button", { name: "Select", exact: true }).nth(plan.outboundIndex).click();
    await expect(outbound.getByRole("button", { name: "Selected" })).toBeVisible();

    const returns = page.getByRole("region", { name: "Return ferries" });
    await expect(returns.getByText("Choose your return ferry")).toBeVisible();
    await returns.getByRole("button", { name: "Select", exact: true }).nth(plan.returnIndex).click();

    const total = Math.round(plan.farePerAdult * ADULTS * 100) / 100;
    await expect(page.getByText(`Total $${total} for ${ADULTS} passengers`)).toBeVisible();
    await shot(page, `${prefix}-2-both-ferries-selected`);
    await page.getByRole("link", { name: /continue/i }).click();
  });

  await test.step("3. Review shows both ferries and the bundle fare", async () => {
    await expect(page).toHaveURL(new RegExp(`/book/${plan.outboundId}/review.*returnTripId=${plan.returnId}`));
    await expect(page.getByText("Your return ferry")).toBeVisible();
    await expect(page.getByText(`${label} fare`).first()).toBeVisible();
    await shot(page, `${prefix}-3-review`);
    await page.getByRole("button", { name: /continue to passenger details/i }).click();
  });

  await test.step("4. Passenger details", async () => {
    await expect(page).toHaveURL(new RegExp(`/passengers.*returnTripId=${plan.returnId}`));
    await page.getByPlaceholder("e.g. Mohamed Solih").first().fill(`E2E ${label} ${Date.now()}`);
    await shot(page, `${prefix}-4-passengers`);
    await page.getByRole("button", { name: /continue to payment/i }).click();
  });

  await test.step("5. Continue to pay: POST /bookings saves trip type, return ferry and bundle price", async () => {
    await expect(page).toHaveURL(new RegExp(`/payment.*returnTripId=${plan.returnId}`));
    const bookingResponse = page.waitForResponse(
      (r) => r.url().endsWith("/bookings") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /continue to pay/i }).click();
    const res = await bookingResponse;
    expect(res.status(), "POST /bookings should succeed").toBe(201);
    booking = (await res.json()).data;
    bookingIds.push(booking.id);

    expect(booking.tripType).toBe(kind === "same-day-return" ? "SAME_DAY_RETURN" : "ROUND_TRIP");
    expect(booking.scheduleId).toBe(plan.outboundId);
    expect(booking.returnScheduleId).toBe(plan.returnId);
    expect(booking.totalAmount).toBe(Math.round(plan.farePerAdult * ADULTS * 100) / 100);
  });

  await test.step("6. Next page: confirmation (payments off) or card form (payments on)", async () => {
    if (booking.status === "CONFIRMED") {
      await expect(page).toHaveURL(/\/confirmation/);
      await expect(page.getByText(`Return · ${label}`)).toBeVisible();
      await shot(page, `${prefix}-5-confirmation`);
    } else {
      expect(booking.status).toBe("PENDING");
      await expect(page.getByText(new RegExp(`${label} fare`)).first()).toBeVisible();
      await shot(page, `${prefix}-5-payment-pending`);
    }
  });

  await test.step("7. Backend: seats taken on the outbound and the return ferry", async () => {
    expect(seatsBefore.out - (await seatsOf(plan.outboundId))).toBe(ADULTS);
    expect(seatsBefore.back - (await seatsOf(plan.returnId))).toBe(ADULTS);
  });
}

test.beforeAll(async () => {
  userApi = await apiAs("user");
});

test.afterAll(async () => {
  // Cancel what we booked: seats go back on both ferries.
  for (const id of bookingIds) {
    await call(userApi, "patch", `/bookings/${id}/cancel`, {}).catch(() => {});
  }
  await userApi?.dispose();
});

test("customer books a same day return (Saba -> Statia -> Saba) @smoke", async ({ page }) => {
  const date = dayFromNow(4);
  const plan = await planTrip("same-day-return", date, date);
  await bookReturnTrip(page, "same-day-return", plan, "same-day");
});

test("customer books a round trip with a later return date", async ({ page }) => {
  const date = dayFromNow(5);
  const plan = await planTrip("round-trip", date, dayFromNow(7));
  await bookReturnTrip(page, "round-trip", plan, "round-trip");
});
