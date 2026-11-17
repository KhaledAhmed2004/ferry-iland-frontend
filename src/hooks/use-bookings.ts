"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApiResponse,
  IBookingDetail,
  IBookingRequestView,
  ICreateBookingPayload,
  ICreateBookingRequestPayload,
} from "@/types";
import { get, patch, post } from "@/lib/api";
import { formatCents } from "@/lib/payment";
import { tripKeys } from "./use-trips";

export const bookingKeys = {
  all: ["bookings"] as const,
  mine: () => [...bookingKeys.all, "my"] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (reference: string, email?: string) =>
    [...bookingKeys.details(), reference, email ?? ""] as const,
  operator: (params?: Record<string, unknown>) => [...bookingKeys.all, "operator", params] as const,
};

/**
 * Spec 0001: a guest proves access to a booking with its reference plus the lead passenger email.
 * The email is kept per browser tab (sessionStorage) right after checkout, so the confirmation and
 * manage pages work without asking again. Storage can be unavailable, so every access is guarded.
 */
const BOOKING_EMAIL_KEY = (reference: string) => `booking-email:${reference}`;

export function rememberBookingEmail(reference: string, email: string) {
  try {
    window.sessionStorage.setItem(BOOKING_EMAIL_KEY(reference), email.trim().toLowerCase());
  } catch {
    // Storage unavailable (private mode, SSR): the manage page will ask for the email instead.
  }
}

export function recallBookingEmail(reference: string): string | undefined {
  try {
    return window.sessionStorage.getItem(BOOKING_EMAIL_KEY(reference)) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * 1. Mutation: Create New Booking (Guest or Authenticated Checkout)
 */
export function useCreateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ICreateBookingPayload) => {
      return await post<ApiResponse<IBookingDetail>>("/bookings", payload);
    },
    onSuccess: async (response, payload) => {
      if (response.data?.reference) {
        rememberBookingEmail(response.data.reference, payload.leadPassengerEmail);
      }
      // Invalidate active trips so seats update immediately for all viewers
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success(response.message || "Booking confirmed successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to confirm booking. Please try again.");
    },
  });
}

/**
 * 2. Query: Lookup Booking by Reference (Self-Service & Confirmation)
 */
export function useBookingLookupQuery(
  reference: string,
  emailVerification?: string,
  options: {
    /** A number, false, or a function of the query (return false to stop, e.g. on error). */
    refetchInterval?: number | false | ((query: { state: { status: string } }) => number | false);
  } = {}
) {
  const email =
    emailVerification?.trim() ||
    (typeof window !== "undefined" ? recallBookingEmail(reference) : undefined);

  return useQuery({
    queryKey: bookingKeys.detail(reference, email),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string> = {};
      if (email) {
        cleanParams.email = email;
      }

      const response = await get<ApiResponse<IBookingDetail>>(`/bookings/manage/${reference}`, {
        params: cleanParams,
        signal,
      });

      return response.data ?? null;
    },
    enabled: Boolean(reference && reference.trim().length >= 4),
    staleTime: 60 * 1000,
    // Polling (spec 0002, AC-6): the confirmation page reads the booking while payment settles.
    refetchInterval: options.refetchInterval ?? false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("not found")) return false;
      return failureCount < 1;
    },
  });
}

/**
 * 3. Mutation: Cancel Booking (Passenger or Operator)
 */
export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      reason,
      email,
    }: {
      bookingId: string;
      reason?: string;
      /** Required for a guest booking (spec 0001); ignored for the signed in owner or an admin. */
      email?: string;
    }) => {
      return await patch<ApiResponse<IBookingDetail>>(`/bookings/${bookingId}/cancel`, {
        reason,
        ...(email ? { email } : {}),
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      // An admin cancel closes a pending change request (spec 0004, AC-19).
      await queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      // Spec 0004: a started refund is PENDING until Stripe settles it.
      const refund = response?.data?.refund;
      toast.success(response?.message || "Booking cancelled successfully.", {
        description: refund
          ? `Your refund of ${formatCents(refund.amountCents)} is processing. It usually reaches your card in 5 to 10 business days.`
          : undefined,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel booking.");
    },
  });
}

/**
 * Spec 0004 (AC-5, AC-6): inside 24h the customer asks the operator to cancel or reschedule.
 * POST /api/v1/bookings/:reference/requests
 */
export function useCreateBookingRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reference,
      ...payload
    }: ICreateBookingRequestPayload & { reference: string }) => {
      return await post<ApiResponse<IBookingRequestView>>(
        `/bookings/${encodeURIComponent(reference)}/requests`,
        payload
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Request sent", {
        description: "The ferry operator will review it and you will see their answer here.",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not send your request.");
    },
  });
}

/**
 * Spec 0004 (AC-6): the customer takes back a request still waiting for the operator.
 * PATCH /api/v1/bookings/:reference/requests/:requestId/withdraw
 */
export function useWithdrawBookingRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reference,
      requestId,
      email,
    }: {
      reference: string;
      requestId: string;
      email?: string;
    }) => {
      return await patch<ApiResponse<IBookingRequestView>>(
        `/bookings/${encodeURIComponent(reference)}/requests/${requestId}/withdraw`,
        email ? { email } : {}
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Request withdrawn");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not withdraw your request.");
    },
  });
}

/**
 * 4. Query: Get Current Logged-in User's Bookings (GET /api/v1/bookings/my)
 */
export function useMyBookingsQuery() {
  return useQuery({
    queryKey: bookingKeys.mine(),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IBookingDetail[]>>("/bookings/my", {
        signal,
      });
      return response.data ?? [];
    },
    staleTime: 30 * 1000,
  });
}

