import type { IPaymentRecord } from "@/types/models";

/** Spec 0001: payment money arrives as integer cents. Convert only for display. */
export function formatCents(cents: number | null | undefined, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents ?? 0) / 100);
}

/**
 * A short, honest label for a payment. A MANUAL payment still PENDING was never charged online,
 * so it reads "Unpaid", not "Paid"; old fake seed rows read "Legacy".
 */
export function paymentStatusLabel(payment: IPaymentRecord | null | undefined): string {
  if (!payment) return "No payment";
  if (payment.provider === "LEGACY_SEED") return "Legacy";
  switch (payment.status) {
    case "COMPLETED":
      return "Paid";
    case "PENDING":
      return payment.provider === "MANUAL" ? "Unpaid" : "Awaiting payment";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "REFUNDED":
      return "Refunded";
    case "FAILED":
      return "Failed";
    case "CANCELED":
      return "Canceled";
    default:
      return payment.status;
  }
}

export function paymentProviderLabel(provider: IPaymentRecord["provider"]): string {
  switch (provider) {
    case "STRIPE":
      return "Stripe";
    case "MANUAL":
      return "Manual (not charged online)";
    case "LEGACY_SEED":
      return "Legacy seed data";
    default:
      return "Unknown";
  }
}
