"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { get, patch } from "@/lib/api";
import { formatCents } from "@/lib/payment";

import type {
  ApiResponse,
  BookingRequestStatus,
  IBookingRequestsResponseData,
  IResolveBookingRequestPayload
} from "@/types";

import { adminKeys } from "./use-admin";
import { bookingKeys } from "./use-bookings";
import { operatorKeys } from "./use-operator";
import { tripKeys } from "./use-trips";

/**
 * Spec 0004: the staff Requests tab. Operators see requests on their own ferries, admins see all;
 * the backend decides the scope from the signed in user.
 */
export interface IBookingRequestFilterParams {
  status?: BookingRequestStatus;
  page?: number;
  limit?: number;
}

export const bookingRequestKeys = {
  all: ["booking-requests"] as const,
  lists: () => [...bookingRequestKeys.all, "list"] as const,
  list: (params: IBookingRequestFilterParams) => [...bookingRequestKeys.lists(), params] as const
};

/** GET /api/v1/booking-requests */
export function useBookingRequestsQuery(params: IBookingRequestFilterParams = {}) {
  return useQuery({
    queryKey: bookingRequestKeys.list(params),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IBookingRequestsResponseData>>("/booking-requests", {
        params,
        signal
      });
      return response.data ?? null;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000
  });
}

/** The pending count for the Requests tab badge (same scope, ignores the status filter). */
export function usePendingBookingRequestCount() {
  const query = useBookingRequestsQuery({ status: "PENDING", page: 1, limit: 1 });
  return { ...query, pendingCount: query.data?.meta.pendingCount ?? 0 };
}

/**
 * PATCH /api/v1/booking-requests/:id/resolve: RESCHEDULE to new trips, CANCEL with a full refund,
 * or REJECT with a note.
 */
export function useResolveBookingRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: IResolveBookingRequestPayload & { id: string }) => {
      return await patch<
        ApiResponse<{ refund: { id: string; amountCents: number; status: string } | null }>
      >(`/booking-requests/${id}/resolve`, payload);
    },
    onSuccess: async (response, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingRequestKeys.all }),
        // A cancel changes the booking, its seats, and the bookings tables.
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: operatorKeys.bookings() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.bookings() }),
        queryClient.invalidateQueries({ queryKey: tripKeys.all })
      ]);
      const refund = response?.data?.refund;
      if (payload.action === "RESCHEDULE") {
        // A move also changes both trips' manifests.
        await queryClient.invalidateQueries({ queryKey: operatorKeys.manifests() });
        toast.success("Booking moved", {
          description: "Ticket numbers stay the same. The customer sees the new trip on their booking."
        });
        return;
      }
      toast.success(payload.action === "CANCEL" ? "Booking cancelled" : "Request rejected", {
        description:
          payload.action === "CANCEL"
            ? refund
              ? `A refund of ${formatCents(refund.amountCents)} was started to the customer's card.`
              : "No card refund was due. Refund any manual payment by hand."
            : "The customer will see your note on their booking."
      });
    },
    onError: async (error: Error) => {
      // The booking or a trip may have changed meanwhile: refresh the pickers for the next try.
      await queryClient.invalidateQueries({ queryKey: ["booking-moves"] });
      toast.error(error.message || "Could not resolve this request.");
    }
  });
}
