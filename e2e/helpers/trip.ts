import type { APIRequestContext } from "@playwright/test";

import { call, listOf } from "./api";

export interface TestTrip {
  scheduleId: string;
  fromPort: string;
  toPort: string;
  ferryName: string;
  departureDate: string; // YYYY-MM-DD (UTC)
  adultFare: number;
  seats: number;
}

/**
 * Creates a fresh, bookable trip owned by the logged-in operator:
 * an ACTIVE route + IN_SERVICE ferry + a new schedule 7–27 days out.
 * Random day/hour avoids clashing with schedules from earlier runs.
 */
export async function createTestTrip(operatorApi: APIRequestContext): Promise<TestTrip> {
  const routes = listOf(await call(operatorApi, "get", "/routes?limit=100"));
  const route = routes.find((r) => r.status === "ACTIVE") ?? routes[0];
  if (!route) throw new Error("Operator has no routes — create one first.");
  if (route.status !== "ACTIVE") {
    await call(operatorApi, "patch", `/routes/${route.id}`, { status: "ACTIVE" });
  }

  const ferries = listOf(await call(operatorApi, "get", "/ferries?limit=100"));
  const ferry = ferries.find((f) => f.status === "IN_SERVICE");
  if (!ferry) throw new Error("Operator has no IN_SERVICE ferry.");

  const dep = new Date();
  dep.setUTCDate(dep.getUTCDate() + 7 + Math.floor(Math.random() * 20));
  dep.setUTCHours(3 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0);
  const arr = new Date(dep.getTime() + (route.durationMinutes ?? 60) * 60_000);

  const adultFare = 40;
  const seats = 20;
  const schedule = await call(operatorApi, "post", "/schedules", {
    routeId: route.id,
    ferryId: ferry.id,
    departureTime: dep.toISOString(),
    arrivalTime: arr.toISOString(),
    gate: "E2E Gate",
    captain: "E2E Captain",
    adultFare,
    childFare: 20,
    availableSeats: seats
  });

  return {
    scheduleId: schedule.id,
    fromPort: schedule.route?.departurePort?.name ?? route.departurePort?.name,
    toPort: schedule.route?.destinationPort?.name ?? route.destinationPort?.name,
    ferryName: ferry.name,
    departureDate: dep.toISOString().slice(0, 10),
    adultFare,
    seats
  };
}

/** Best-effort cleanup: cancel bookings we made, then delete (or cancel) the schedule. */
export async function cleanupTestTrip(
  operatorApi: APIRequestContext,
  userApi: APIRequestContext,
  scheduleId: string,
  bookingIds: string[]
) {
  for (const id of bookingIds) {
    await call(userApi, "patch", `/bookings/${id}/cancel`, {}).catch(() => {});
  }
  await call(operatorApi, "delete", `/schedules/${scheduleId}`).catch(() =>
    call(operatorApi, "patch", `/schedules/${scheduleId}/status`, { status: "CANCELLED" }).catch(() => {})
  );
}
