"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse, IBookingDetail, IPaymentConflict, IPaymentIntent } from "@/types";
import { ApiRequestError, post } from "@/lib/api";
import { bookingKeys } from "./use-bookings";

/**
 * Spec 0002: real card payments. The intent endpoint returns the server's amount and a client
 * secret for Stripe's Payment Element; card data goes straight from the browser to Stripe.
 */

/** The booking a payment page is paying for, kept per tab so a reload resumes it (AC-3). */
export interface IPendingCheckout {
  bookingId: string;
  reference: string;
  /** The payment page's query string (passengers, date, ports), so a 3DS failure can return to it. */
  search?: string;
  /** The passenger details this booking was made with; a resume with different ones starts over. */
  passengersKey?: string;
}

const PENDING_CHECKOUT_KEY = (tripId: string) => `booking_${tripId}_pending`;

export function rememberPendingCheckout(tripId: string, checkout: IPendingCheckout) {
  try {
    window.sessionStorage.setItem(PENDING_CHECKOUT_KEY(tripId), JSON.stringify(checkout));
  } catch {
    // Storage unavailable: a reload starts checkout again (accepted tradeoff, spec 0002).
  }
}

export function recallPendingCheckout(tripId: string): IPendingCheckout | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_KEY(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IPendingCheckout>;
    return parsed.bookingId && parsed.reference
      ? {
          bookingId: parsed.bookingId,
          reference: parsed.reference,
          search: parsed.search,
          passengersKey: parsed.passengersKey
        }
      : null;
  } catch {
    return null;
  }
}

export function forgetPendingCheckout(tripId: string) {
  try {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY(tripId));
  } catch {
    // Nothing to clear.
  }
}

/** The 409 body from the intent endpoint, when that is what the error carries. */
export function paymentConflictOf(error: unknown): IPaymentConflict | null {
  if (!(error instanceof ApiRequestError) || error.status !== 409) return null;
  const data = error.data as Partial<IPaymentConflict> | undefined;
  return data?.code && data.bookingStatus ? (data as IPaymentConflict) : null;
}

/** POST /payments/intent: create the booking's PaymentIntent, or get the same one back. */
export function useCreatePaymentIntentMutation() {
  return useMutation({
    mutationFn: async (payload: { bookingId: string; email?: string }) => {
      const response = await post<ApiResponse<IPaymentIntent>>("/payments/intent", payload);
      if (!response.data) throw new Error("Payment service unavailable, try again");
      return response.data;
    },
  });
}

/** POST /payments/:bookingId/sync: ask the server to check Stripe now (slow webhook backup). */
export function useSyncPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, email }: { bookingId: string; email?: string }) => {
      const response = await post<ApiResponse<IBookingDetail>>(
        `/payments/${bookingId}/sync`,
        email ? { email } : {}
      );
      return response.data ?? null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookingKeys.details() });
    },
  });
}
