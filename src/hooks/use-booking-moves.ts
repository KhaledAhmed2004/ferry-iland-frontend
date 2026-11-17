"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { get, post } from "@/lib/api";

import type { ApiResponse, BookingLeg, IMoveBookingPayload, IMoveOption } from "@/types";

import { adminKeys } from "./use-admin";
import { bookingRequestKeys } from "./use-booking-requests";
import { bookingKeys } from "./use-bookings";
import { operatorKeys } from "./use-operator";
import { tripKeys } from "./use-trips";

/**
 * Spec 0004: moving a booking leg to another trip on the same route and operator. The backend
 * decides which trips are allowed; the pickers only show what it returns.
 */
export const bookingMoveKeys = {
  all: ["booking-moves"] as const,
  options: (reference: string, leg: BookingLeg, email?: string) =>
    [...bookingMoveKeys.all, "options", reference, leg, email ?? ""] as const
};

/** GET /api/v1/bookings/:reference/move-options?leg=OUTBOUND|RETURN (AC-15). */
export function useMoveOptionsQuery(
  reference: string | null | undefined,
  leg: BookingLeg,
  options: { email?: string; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: bookingMoveKeys.options(reference ?? "", leg, options.email),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IMoveOption[]>>(
        `/bookings/${encodeURIComponent(reference ?? "")}/move-options`,
        { params: { leg, ...(options.email ? { email: options.email } : {}) }, signal }
      );
      return response.data ?? [];
    },
    enabled: !!reference && (options.enabled ?? true),
    // Seats change quickly; refetch each time a picker opens.
    staleTime: 0,
    retry: false
  });
}

/** Everything a move changes: the booking, both trips' seats, manifests, and request lists. */
export async function invalidateAfterMove(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: bookingMoveKeys.all }),
    queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
    queryClient.invalidateQueries({ queryKey: bookingRequestKeys.all }),
    queryClient.invalidateQueries({ queryKey: operatorKeys.bookings() }),
    queryClient.invalidateQueries({ queryKey: operatorKeys.manifests() }),
    queryClient.invalidateQueries({ queryKey: adminKeys.bookings() }),
    queryClient.invalidateQueries({ queryKey: tripKeys.all })
  ]);
}

/** POST /api/v1/bookings/:reference/move, a direct staff move (AC-11 to AC-14, AC-19). */
export function useMoveBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reference, ...payload }: IMoveBookingPayload & { reference: string }) => {
      return await post<ApiResponse<unknown>>(
        `/bookings/${encodeURIComponent(reference)}/move`,
        payload
      );
    },
    onSuccess: async () => {
      await invalidateAfterMove(queryClient);
      toast.success("Booking moved", {
        description: "Ticket numbers stay the same. The new trip's manifest now lists this booking."
      });
    },
    onError: async (error: Error) => {
      // A changed booking or a trip that just filled up: show fresh data for the next try.
      await queryClient.invalidateQueries({ queryKey: bookingMoveKeys.all });
      toast.error(error.message || "Could not move this booking.");
    }
  });
}
