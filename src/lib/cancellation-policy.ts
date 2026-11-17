/**
 * Spec 0004 (AC-18): the cancellation policy line shown at checkout and on manage booking.
 * Mirrors `CANCEL_FREE_HOURS` in backend/src/app/modules/booking/booking.policy.ts, which is the
 * rule the server enforces; change both together. The manage booking page never computes the
 * rule itself, it renders the backend's `cancellation` block.
 */
export const CANCEL_FREE_HOURS = 24;

export const CANCELLATION_POLICY_TEXT =
  `Free cancellation with a full refund until ${CANCEL_FREE_HOURS} hours before departure. ` +
  "After that, you can send a request and the ferry operator decides on changes and cancellations.";
