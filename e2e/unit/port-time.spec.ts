import { expect, test } from "@playwright/test";

import { laterDate, searchDepartureDate } from "../../src/hooks/use-port-today";
import {
  formatCalendarDate,
  formatPortDate,
  formatPortDateTime,
  formatPortTime,
  portLocalDate,
  portToday,
  portZoneLabel,
  toWallTimeInput,
  wallTimeToDate
} from "../../src/lib/port-time";

/**
 * Port local time helpers (spec 0003). Pure functions, no browser or login needed:
 *   npx playwright test e2e/unit --no-deps --project=chromium
 * Every case runs with the process clock in two far apart zones, so a helper that leaks the
 * runner's own zone fails one of them.
 */

const AST_PORTS = [
  "America/Anguilla",
  "America/Marigot",
  "America/Lower_Princes",
  "America/Kralendijk",
  "America/St_Kitts"
];
// 01:00Z on 7 Nov is 21:00 AST on Friday 6 Nov at every port.
const EVENING = "2026-11-07T01:00:00.000Z";

for (const runnerZone of ["Asia/Dhaka", "America/New_York"]) {
  test.describe(`port time helpers with the runner in ${runnerZone}`, () => {
    let previousZone: string | undefined;
    test.beforeAll(() => {
      previousZone = process.env.TZ;
      process.env.TZ = runnerZone;
    });
    test.afterAll(() => {
      process.env.TZ = previousZone;
    });

    test("the runner clock really is in this zone (guards the guard)", () => {
      // 01:00Z is 07:00 in Dhaka and 20:00 (previous day) in New York.
      expect(new Date(EVENING).getHours()).toBe(runnerZone === "Asia/Dhaka" ? 7 : 20);
    });

    test("formats time and date at the port, not the runner (covers: AC-4)", () => {
      expect(formatPortTime(EVENING, "America/Anguilla")).toBe("9:00 PM");
      expect(formatPortDate(EVENING, "America/Anguilla")).toBe("Fri 6 Nov");
      expect(formatPortDate(EVENING, "America/Anguilla", "dd MMM yyyy, hh:mm a")).toBe("06 Nov 2026, 09:00 PM");
    });

    test("labels kept documents with the zone and local time (covers: AC-5)", () => {
      expect(formatPortDateTime(EVENING, "America/Lower_Princes", { label: true })).toBe(
        "Fri 6 Nov, 9:00 PM AST (local time)"
      );
      expect(formatPortDateTime(EVENING, "America/Lower_Princes")).toBe("Fri 6 Nov, 9:00 PM");
    });

    for (const zone of AST_PORTS) {
      test(`zone label for ${zone} is AST (covers: AC-5)`, () => {
        expect(portZoneLabel(EVENING, zone)).toBe("AST");
      });
    }

    test("zone label falls back to the UTC offset when no short name exists", () => {
      // en-US has no short name for India, it prints GMT+5:30.
      expect(portZoneLabel(EVENING, "Asia/Kolkata")).toBe("UTC+5:30");
    });

    test("local date and today come from the port zone (covers: AC-4, AC-13)", () => {
      expect(portLocalDate(EVENING, "America/Anguilla")).toBe("2026-11-06");
      expect(portToday("America/Anguilla", new Date(EVENING))).toBe("2026-11-06");
    });

    test("a calendar date string never shifts a day (covers: AC-4)", () => {
      expect(formatCalendarDate("2026-11-06")).toBe("Fri 6 Nov 2026");
      expect(formatCalendarDate("2026-11-06", "EEE, d MMM yyyy")).toBe("Fri, 6 Nov 2026");
    });

    test("datetime-local values round trip through the port zone (covers: AC-6)", () => {
      expect(toWallTimeInput("2026-11-06T12:30:00.000Z", "America/Lower_Princes")).toBe("2026-11-06T08:30");
      expect(wallTimeToDate("2026-11-06T08:30", "America/Lower_Princes")?.toISOString()).toBe(
        "2026-11-06T12:30:00.000Z"
      );
      const wall = toWallTimeInput(EVENING, "America/Kralendijk");
      expect(wallTimeToDate(wall, "America/Kralendijk")?.toISOString()).toBe(EVENING);
    });

    test("wallTimeToDate rejects text that is not a datetime-local value", () => {
      expect(wallTimeToDate("2026-11-06", "America/Anguilla")).toBeNull();
      expect(wallTimeToDate("tomorrow", "America/Anguilla")).toBeNull();
    });
  });
}

test.describe("search date default (covers: AC-10)", () => {
  test("nothing picked, browser a day ahead of the port: today at the port", () => {
    expect(searchDepartureDate("", "2026-11-06", "2026-11-05")).toBe("2026-11-05");
  });

  test("nothing picked, browser a day behind the port: today at the port", () => {
    expect(searchDepartureDate("", "2026-11-05", "2026-11-06")).toBe("2026-11-06");
  });

  test("nothing picked, port zone not loaded yet: the browser's today as a placeholder", () => {
    expect(searchDepartureDate("", "2026-11-05", null)).toBe("2026-11-05");
  });

  test("a picked day already past at the port moves up to the port's today", () => {
    expect(searchDepartureDate("2026-11-04", "2026-11-05", "2026-11-05")).toBe("2026-11-05");
  });

  test("a picked future day is kept", () => {
    expect(searchDepartureDate("2026-11-09", "2026-11-05", "2026-11-05")).toBe("2026-11-09");
  });

  test("laterDate keeps the later of two calendar dates", () => {
    expect(laterDate("2026-11-04", "2026-11-05")).toBe("2026-11-05");
    expect(laterDate("2026-11-09", "2026-11-05")).toBe("2026-11-09");
    expect(laterDate("2026-11-09", null)).toBe("2026-11-09");
  });
});
