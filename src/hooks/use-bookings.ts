"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse, IBookingDetail, ICreateBookingPayload } from "@/types";
import { get, patch, post } from "@/lib/api";
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
export function useBookingLookupQuery(reference: string, emailVerification?: string) {
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
      toast.success(response?.message || "Booking cancelled successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel booking.");
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

