import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL, apiAs, call } from "../helpers/api";
import { cleanupTestTrip, createTestTrip, type TestTrip } from "../helpers/trip";

/**
 * FLOW 6: Pay at checkout (spec 0002, child 0002-pay-at-checkout, AC-1 to AC-6).
 *
 * The confirmation page states run on any backend. The card tests need the backend started
 * with PAYMENTS_ENABLED=true, Stripe test keys (backend STRIPE_SECRET_KEY, frontend
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) and they charge Stripe test cards. They skip themselves
 * when the backend still confirms bookings on create, so a normal run never touches Stripe.
 */
test.describe.configure({ mode: "serial" });
// Checkout as a guest: no saved login, identity by the lead passenger email.
test.use({ storageState: { cookies: [], origins: [] } });

let operatorApi: APIRequestContext;
let userApi: APIRequestContext;
let guestApi: APIRequestContext;
let trip: TestTrip;
let paymentsOn = false;
const guestBookings: Array<{ id: string; email: string }> = [];

const uniqueEmail = (tag: string) => `e2e-pay-${tag}-${Date.now()}@test.local`;

/** A guest booking made straight through the API. */
async function guestBooking(email: string) {
  const res = await guestApi.post("bookings", {
    data: {
      scheduleId: trip.scheduleId,
      leadPassengerName: "E2E Pay Guest",
      leadPassengerEmail: email,
      adultsCount: 1,
      childrenCount: 0,
      passengers: [{ passengerName: "E2E Pay Guest", nationality: "US", passportOrId: "EP1000" }]
    }
  });
  expect(res.status(), "POST /bookings should succeed").toBe(201);
  const data = (await res.json()).data;
  guestBookings.push({ id: data.id, email });
  return data as { id: string; reference: string; status: string };
}

async function lookup(reference: string, email: string) {
  const res = await guestApi.get(`bookings/manage/${reference}`, { params: { email } });
  return (await res.json()).data;
}

/** What the passengers step leaves in sessionStorage before the payment page. */
async function seedPassengers(page: Page, email: string) {
  await page.addInitScript(
    ({ tripId, leadEmail }) => {
      const key = `booking_${tripId}_passengers`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            leadName: "E2E Pay Guest",
            leadEmail,
            leadPhone: "+1 555 0100",
            passengers: [{ fullName: "E2E Pay Guest", nationality: "US", passportOrId: "EP1000", cabinClass: "STANDARD" }]
          })
        );
      }
    },
    { tripId: trip.scheduleId, leadEmail: email }
  );
}

/** What checkout leaves behind so a guest's confirmation page can read the booking. */
async function rememberEmail(page: Page, reference: string, email: string) {
  await page.addInitScript(({ ref, mail }) => sessionStorage.setItem(`booking-email:${ref}`, mail), {
    ref: reference,
    mail: email
  });
}

const paymentPath = () =>
  `/book/${trip.scheduleId}/payment?passengers=1&departureDate=${trip.departureDate}` +
  `&from=${encodeURIComponent(trip.fromPort)}&to=${encodeURIComponent(trip.toPort)}`;

const pendingCheckout = (page: Page) =>
  page.evaluate(
    (tripId) => JSON.parse(sessionStorage.getItem(`booking_${tripId}_pending`) || "null"),
    trip.scheduleId
  ) as Promise<{ bookingId: string; reference: string } | null>;

const cardFrame = (page: Page) => page.frameLocator('iframe[title="Secure payment input frame"]').first();

/** "Continue to pay" → booking + intent → the Payment Element is ready. Returns the intent body. */
async function continueToPay(page: Page) {
  const intentResponse = page.waitForResponse(
    (r) => r.url().endsWith("/payments/intent") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Continue to pay" }).click();
  const intent = (await (await intentResponse).json()).data;
  test.skip(
    await page.getByText("Card payments are not configured").isVisible(),
    "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in the frontend to run the card tests"
  );
  await expect(page.getByRole("button", { name: /^Pay \$/ })).toBeVisible();
  await expect(cardFrame(page).locator('input[name="number"]')).toBeVisible({ timeout: 30_000 });
  return intent as { amountCents: number; clientSecret: string; bookingReference: string };
}

async function fillCard(page: Page, number: string) {
  const frame = cardFrame(page);
  await frame.locator('input[name="number"]').fill(number);
  await frame.locator('input[name="expiry"]').fill("12 / 34");
  await frame.locator('input[name="cvc"]').fill("123");
  const zip = frame.locator('input[name="postalCode"]');
  if (await zip.count()) await zip.fill("10001");
}

test.beforeAll(async () => {
  operatorApi = await apiAs("operator");
  userApi = await apiAs("user");
  guestApi = await request.newContext({ baseURL: `${API_URL}/` });
  trip = await createTestTrip(operatorApi);

  // Ask the backend which flow it runs: a new booking waits for payment only when payments are on.
  const probe = await guestBooking(uniqueEmail("probe"));
  paymentsOn = probe.status === "PENDING";
});

test.afterAll(async () => {
  for (const b of guestBookings) {
    await guestApi.patch(`bookings/${b.id}/cancel`, { data: { email: b.email } }).catch(() => {});
  }
  if (trip) await cleanupTestTrip(operatorApi, userApi, trip.scheduleId, []);
  await Promise.all([operatorApi?.dispose(), userApi?.dispose(), guestApi?.dispose()]);
});

test.describe("confirmation page states (any backend)", () => {
  test("AC-6: a confirmation link opened without the saved email shows the Manage booking prompt", async ({ page }) => {
    const booking = await guestBooking(uniqueEmail("noemail"));
    let lookups = 0;
    page.on("request", (r) => {
      if (r.url().includes(`/bookings/manage/${booking.reference}`)) lookups += 1;
    });

    await page.goto(`/book/${trip.scheduleId}/confirmation?ref=${booking.reference}`);

    await expect(page.getByRole("heading", { name: "We could not show this booking here" })).toBeVisible();
    await expect(page.locator(`a[href="/manage-booking/${booking.reference}"]`)).toBeVisible();
    await expect(page.getByText("Your booking is confirmed!")).toHaveCount(0);

    // The error screen must not keep asking the server (review finding: polling forever).
    const lookupsAtError = lookups;
    await page.waitForTimeout(5_000);
    expect(lookups, "no polling while the booking cannot be read").toBe(lookupsAtError);
  });

  test("AC-6: a cancelled booking shows its status, never confirmed", async ({ page }) => {
    const email = uniqueEmail("cancelled");
    const booking = await guestBooking(email);
    await call(guestApi, "patch", `/bookings/${booking.id}/cancel`, { email });
    await rememberEmail(page, booking.reference, email);

    await page.goto(`/book/${trip.scheduleId}/confirmation?ref=${booking.reference}`);

    await expect(page.getByRole("heading", { name: "This booking is cancelled" })).toBeVisible();
    await expect(page.getByText("Your booking is confirmed!")).toHaveCount(0);
  });

  test("AC-6: a failed bank check in a browser without this checkout goes to Manage booking, not a second booking", async ({ page }) => {
    const booking = await guestBooking(uniqueEmail("bankfail"));
    let bookingsCreated = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/bookings") && r.method() === "POST") bookingsCreated += 1;
    });

    await page.goto(
      `/book/${trip.scheduleId}/confirmation?ref=${booking.reference}&payment_intent=pi_x&redirect_status=failed`
    );

    await expect(page).toHaveURL(new RegExp(`/manage-booking/${booking.reference}`));
    expect(bookingsCreated).toBe(0);
  });
});

test.describe("card payments (backend PAYMENTS_ENABLED=true, Stripe test mode)", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(() => {
    test.skip(!paymentsOn, "Backend confirms bookings on create; start it with PAYMENTS_ENABLED=true");
  });

  test("AC-1, AC-3, AC-6: a guest pays with a test card and lands on confirmed tickets", async ({ page }) => {
    const email = uniqueEmail("happy");
    await seedPassengers(page, email);
    const backendRequests: string[] = [];
    page.on("request", (r) => {
      if (r.url().startsWith(API_URL.replace(/\/api\/v1$/, ""))) backendRequests.push(r.url() + (r.postData() ?? ""));
    });

    await page.goto(paymentPath());
    await expect(page.getByPlaceholder("0000 0000 0000 0000"), "the sample card form is gone").toHaveCount(0);
    const intent = await continueToPay(page);
    guestBookings.push({ id: (await pendingCheckout(page))!.bookingId, email });

    // The amount shown comes from the server's intent response (AC-1, AC-3).
    await expect(page.getByRole("button", { name: /^Pay \$/ })).toHaveText(
      `Pay $${(intent.amountCents / 100).toFixed(2)}`
    );
    await expect(page.getByText(/Seats held for \d\d:\d\d/)).toBeVisible();

    await fillCard(page, "4242 4242 4242 4242");
    await page.getByRole("button", { name: /^Pay \$/ }).click();

    await expect(page).toHaveURL(
      new RegExp(`/confirmation\\?ref=${intent.bookingReference}.*redirect_status=succeeded`),
      { timeout: 60_000 }
    );
    await expect(page.getByText("Your booking is confirmed!")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible();

    const saved = await lookup(intent.bookingReference, email);
    expect(saved.status).toBe("CONFIRMED");
    expect(saved.payment.status).toBe("COMPLETED");
    expect(backendRequests.some((r) => /4242\s?4242/.test(r)), "card number must never reach our server").toBe(false);
  });

  test("AC-4: a declined card shows Stripe's error, keeps the booking pending, then another card succeeds", async ({ page }) => {
    const email = uniqueEmail("decline");
    await seedPassengers(page, email);
    await page.goto(paymentPath());
    const intent = await continueToPay(page);
    guestBookings.push({ id: (await pendingCheckout(page))!.bookingId, email });

    await fillCard(page, "4000 0000 0000 0002");
    await page.getByRole("button", { name: /^Pay \$/ }).click();

    await expect(page.getByRole("alert").filter({ hasText: /declined/i })).toBeVisible({ timeout: 45_000 });
    expect((await lookup(intent.bookingReference, email)).status).toBe("PENDING");

    await fillCard(page, "4242 4242 4242 4242");
    await page.getByRole("button", { name: /^Pay \$/ }).click();
    await expect(page.getByText("Your booking is confirmed!")).toBeVisible({ timeout: 60_000 });
    expect(new URL(page.url()).searchParams.get("ref"), "same booking, not a new one").toBe(intent.bookingReference);
  });

  test("AC-3: reloading the payment page resumes the same booking and intent", async ({ page }) => {
    const email = uniqueEmail("reload");
    await seedPassengers(page, email);
    await page.goto(paymentPath());
    const first = await continueToPay(page);
    const pending = (await pendingCheckout(page))!;
    guestBookings.push({ id: pending.bookingId, email });

    const intentAgain = page.waitForResponse((r) => r.url().endsWith("/payments/intent"));
    const bookingCreated = page
      .waitForRequest((r) => r.url().endsWith("/bookings") && r.method() === "POST", { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    await page.reload();
    const second = (await (await intentAgain).json()).data;
    await expect(page.getByRole("button", { name: /^Pay \$/ })).toBeVisible();

    expect(second.clientSecret, "same intent").toBe(first.clientSecret);
    expect(second.bookingReference).toBe(first.bookingReference);
    expect(await bookingCreated, "no second booking").toBe(false);
  });

  test("AC-6: a failed bank check returns to payment with the bank message and the same intent", async ({ page }) => {
    const email = uniqueEmail("bankfail-tab");
    await seedPassengers(page, email);
    await page.goto(paymentPath());
    const first = await continueToPay(page);
    guestBookings.push({ id: (await pendingCheckout(page))!.bookingId, email });

    const intentAgain = page.waitForResponse((r) => r.url().endsWith("/payments/intent"));
    await page.goto(
      `/book/${trip.scheduleId}/confirmation?ref=${first.bookingReference}&payment_intent=pi_x&redirect_status=failed`
    );

    await expect(page).toHaveURL(new RegExp(`/book/${trip.scheduleId}/payment\\?.*payment_error=bank_declined`));
    await expect(page.getByRole("alert").filter({ hasText: "Your bank did not approve the payment" })).toBeVisible();
    expect((await (await intentAgain).json()).data.clientSecret, "same intent").toBe(first.clientSecret);
    await expect(page.getByRole("button", { name: /^Pay \$/ })).toBeEnabled();
  });

  test("AC-3: changing the passengers after booking releases the old hold and starts over", async ({ page }) => {
    const email = uniqueEmail("changed");
    await seedPassengers(page, email);
    await page.goto(paymentPath());
    const first = await continueToPay(page);
    const old = (await pendingCheckout(page))!;
    guestBookings.push({ id: old.bookingId, email });

    // As if the customer went back to the passengers step and edited a name.
    await page.evaluate((tripId) => {
      const key = `booking_${tripId}_passengers`;
      const data = JSON.parse(sessionStorage.getItem(key)!);
      data.passengers[0].fullName = "E2E Pay Guest Edited";
      sessionStorage.setItem(key, JSON.stringify(data));
    }, trip.scheduleId);
    await page.reload();

    await expect(page.getByRole("button", { name: "Continue to pay" })).toBeVisible();
    expect(await pendingCheckout(page), "old checkout forgotten").toBeNull();
    await expect.poll(async () => (await lookup(first.bookingReference, email)).status).toBe("CANCELLED");
  });

  test("AC-5: when the hold runs out the Pay button is disabled and start again links to the review page", async ({ page }) => {
    const email = uniqueEmail("expire");
    await seedPassengers(page, email);
    await page.clock.install();
    await page.goto(paymentPath());
    await continueToPay(page);
    guestBookings.push({ id: (await pendingCheckout(page))!.bookingId, email });

    await page.clock.fastForward("15:30");

    await expect(page.getByText(/Your hold expired/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay \$/ })).toBeDisabled();
    await expect(page.getByRole("link", { name: "start again" }).first()).toHaveAttribute(
      "href",
      new RegExp(`/book/${trip.scheduleId}/review\\?`)
    );
  });

  test("AC-5: the countdown follows the server hold even when the browser clock is 5 minutes fast", async ({ page }) => {
    const email = uniqueEmail("skew");
    await seedPassengers(page, email);
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + 5 * 60_000;
    });
    await page.goto(paymentPath());
    const intent = await continueToPay(page);
    guestBookings.push({ id: (await pendingCheckout(page))!.bookingId, email });

    const text = await page.getByText(/Seats held for/).innerText();
    const [, mm, ss] = text.match(/(\d\d):(\d\d)/)!;
    const shownSeconds = Number(mm) * 60 + Number(ss);
    const booking = await lookup(intent.bookingReference, email);
    const trueSeconds = (new Date(booking.holdExpiresAt).getTime() - Date.now()) / 1000;

    expect(Math.abs(shownSeconds - trueSeconds), `shown ${text}, true ${Math.round(trueSeconds)}s`).toBeLessThan(10);
  });

  test("AC-6: an unpaid booking syncs once after 10 seconds and reports processing after 60", async ({ page }) => {
    const email = uniqueEmail("processing");
    const booking = await guestBooking(email);
    await call(guestApi, "post", "/payments/intent", { bookingId: booking.id, email });
    await rememberEmail(page, booking.reference, email);
    let syncCalls = 0;
    page.on("request", (r) => {
      if (r.url().endsWith(`/payments/${booking.id}/sync`)) syncCalls += 1;
    });
    await page.clock.install();

    await page.goto(`/book/${trip.scheduleId}/confirmation?ref=${booking.reference}`);
    await expect(page.getByRole("heading", { name: "Confirming your payment..." })).toBeVisible();

    const sync = page.waitForRequest((r) => r.url().endsWith(`/payments/${booking.id}/sync`));
    await page.clock.fastForward(11_000);
    await sync;

    await page.clock.fastForward(50_000);
    await expect(page.getByRole("heading", { name: "Your payment is processing" })).toBeVisible();
    await expect(page.locator(`a[href="/manage-booking/${booking.reference}"]`)).toBeVisible();
    expect(syncCalls, "sync is called once per page load").toBe(1);
  });
});
