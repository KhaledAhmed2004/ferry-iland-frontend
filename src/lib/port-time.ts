import { TZDate, tz } from "@date-fns/tz";
import { format } from "date-fns";

/**
 * Port local time helpers (spec 0003). Every trip date or time shown in the app goes through
 * here, always with the port's IANA `timeZone` from the API, so the text reads the same for a
 * viewer in any zone and matches the clock at the dock. There is no default zone on purpose.
 */

type Instant = string | Date;

const toDate = (value: Instant) => (value instanceof Date ? value : new Date(value));

const inZone = (timeZone: string) => ({ in: tz(timeZone) });

/** `8:30 AM` at the port. */
export function formatPortTime(value: Instant, timeZone: string): string {
  return format(toDate(value), "h:mm a", inZone(timeZone));
}

/** `Thu 6 Nov` (or a custom date-fns pattern) at the port. */
export function formatPortDate(value: Instant, timeZone: string, pattern = "EEE d MMM"): string {
  return format(toDate(value), pattern, inZone(timeZone));
}

/**
 * Short zone name at that moment, e.g. `AST`. Falls back to the offset (`UTC−4`) when the
 * runtime only knows a `GMT-4` style name.
 */
export function portZoneLabel(value: Instant, timeZone: string): string {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(toDate(value))
      .find((part) => part.type === "timeZoneName")?.value ?? "";
  if (/^[A-Z]{2,5}$/.test(name)) return name;
  const offset = /^(?:GMT|UTC)([+-]\d{1,2}(?::\d{2})?)?$/.exec(name);
  return offset ? `UTC${(offset[1] ?? "+0").replace("-", "−")}` : name;
}

/**
 * `Thu 6 Nov, 8:30 AM`; with `{ label: true }` adds ` AST (local time)` for tickets and
 * confirmations people keep (spec 0003, AC-5).
 */
export function formatPortDateTime(
  value: Instant,
  timeZone: string,
  options: { label?: boolean; datePattern?: string } = {}
): string {
  const text = `${formatPortDate(value, timeZone, options.datePattern)}, ${formatPortTime(value, timeZone)}`;
  return options.label ? `${text} ${portZoneLabel(value, timeZone)} (local time)` : text;
}

/** The port local calendar date (`YYYY-MM-DD`) of an instant. */
export function portLocalDate(value: Instant, timeZone: string): string {
  return format(toDate(value), "yyyy-MM-dd", inZone(timeZone));
}

/** Today's date (`YYYY-MM-DD`) at the port. Call it in the browser only (it reads "now"). */
export function portToday(timeZone: string, now: Date = new Date()): string {
  return portLocalDate(now, timeZone);
}

/**
 * Formats a calendar date string (`YYYY-MM-DD`, e.g. a search date) without shifting it a day:
 * `new Date("2026-11-06")` is UTC midnight and renders as 5 Nov in the Americas.
 */
export function formatCalendarDate(ymd: string, pattern = "EEE d MMM yyyy"): string {
  return format(new Date(`${ymd}T12:00:00Z`), pattern, inZone("UTC"));
}

/** The `datetime-local` input value (`YYYY-MM-DDTHH:mm`) for an instant, as wall time at the port. */
export function toWallTimeInput(value: Instant, timeZone: string): string {
  return format(toDate(value), "yyyy-MM-dd'T'HH:mm", inZone(timeZone));
}

/**
 * The instant a `datetime-local` value (`YYYY-MM-DDTHH:mm`) means at the port, for client side
 * previews and checks only. The backend does the authoritative conversion (spec 0003, AC-6).
 */
export function wallTimeToDate(wall: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  return new Date(new TZDate(year, month - 1, day, hour, minute, timeZone).getTime());
}
