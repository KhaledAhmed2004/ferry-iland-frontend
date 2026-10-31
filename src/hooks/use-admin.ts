import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApiResponse,
  IAdminAnalyticsOverview,
  IAdminBookingFilterParams,
  IAdminBookingItem,
  IAdminBookingsResponseData,
  IAdminPaymentsFilterParams,
  IAdminPaymentsResponseData,
  IAdminProviderDetail,
  IAdminProviderItem,
  IPlatformSettings,
  IProviderStatusUpdatePayload,
  IUpdatePaymentSettingsPayload,
  ProviderFilterParams
} from "@/types";

import { del, get, patch, post } from "@/lib/api";

/**
 * Admin Query Key Factory
 */
export const adminKeys = {
  all: ["admin"] as const,
  analytics: (periodOrDays?: string | number) =>
    [...adminKeys.all, "analytics", periodOrDays ?? "30d"] as const,
  providers: () => [...adminKeys.all, "providers"] as const,
  providerLists: () => [...adminKeys.providers(), "list"] as const,
  providerList: (params?: ProviderFilterParams) => [...adminKeys.providerLists(), params] as const,
  providerDetails: () => [...adminKeys.providers(), "detail"] as const,
  providerDetail: (id: string) => [...adminKeys.providerDetails(), id] as const,
  bookings: () => [...adminKeys.all, "bookings"] as const,
  bookingLists: () => [...adminKeys.bookings(), "list"] as const,
  bookingList: (params?: IAdminBookingFilterParams) => [...adminKeys.bookingLists(), params] as const,
  payments: () => [...adminKeys.all, "payments"] as const,
  paymentLists: () => [...adminKeys.payments(), "list"] as const,
  paymentList: (params?: IAdminPaymentsFilterParams) => [...adminKeys.paymentLists(), params] as const,
  settings: () => [...adminKeys.all, "settings"] as const
};

/**
 * 1. Query: Fetch Admin Platform Analytics & Real-Time Overview
 */
export function useAdminAnalyticsQuery(periodOrDays: string | number = "30d") {
  const queryParam =
    typeof periodOrDays === "number"
      ? `days=${periodOrDays}`
      : `period=${encodeURIComponent(periodOrDays)}`;

  return useQuery({
    queryKey: adminKeys.analytics(periodOrDays),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IAdminAnalyticsOverview>>(
        `/admin/analytics/overview?${queryParam}`,
        {
          signal
        }
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 3, // Fresh for 3 minutes
    placeholderData: (previousData) => previousData
  });
}

/**
 * 2. Query: Fetch Paginated & Filtered Registered Ferry Providers
 */
export function useAdminProvidersQuery(params?: ProviderFilterParams) {
  return useQuery({
    queryKey: adminKeys.providerList(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number> = {};
      if (params?.searchTerm && params.searchTerm.trim()) {
        cleanParams.searchTerm = params.searchTerm.trim();
      }
      if (params?.status && params.status !== "ALL" && params.status !== "all" && params.status.trim()) {
        cleanParams.status = params.status;
      }
      if (params?.page) cleanParams.page = params.page;
      if (params?.limit) cleanParams.limit = params.limit;
      if (params?.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const response = await get<
        ApiResponse<IAdminProviderItem[]> & {
          pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPage?: number;
            totalPages?: number;
          };
        }
      >("/admin/providers", {
        params: cleanParams,
        signal
      });

      const pagination = response.pagination;
      const normalizedMeta = pagination
        ? {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: pagination.totalPages ?? pagination.totalPage ?? 1
          }
        : response.meta;

      return {
        providers: response.data ?? [],
        meta: normalizedMeta
      };
    },
    staleTime: 0,
    placeholderData: (previousData) => previousData
  });
}

/**
 * 3. Query: Fetch Single Provider Details with Fleet, Routes, and Bookings
 */
export function useAdminProviderDetailQuery(providerId: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.providerDetail(providerId),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IAdminProviderDetail>>(`/admin/providers/${providerId}`, {
        signal
      });
      return response.data;
    },
    enabled: Boolean(providerId) && enabled,
    staleTime: 1000 * 60 * 5
  });
}

/**
 * 4. Mutation: Update Provider Operational Status (Active / Suspended)
 */
export function useUpdateProviderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      payload
    }: {
      providerId: string;
      payload: IProviderStatusUpdatePayload;
    }) => {
      return await patch<ApiResponse<{ provider: unknown; deactivatedTripsCount?: number }>>(
        `/admin/providers/${providerId}/status`,
        payload
      );
    },
    onSuccess: (response, variables) => {
      // Invalidate both the provider list and specific provider detail
      queryClient.invalidateQueries({ queryKey: adminKeys.providers() });
      queryClient.invalidateQueries({ queryKey: adminKeys.providerDetail(variables.providerId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics() });

      const newStatus = variables.payload.status;
      toast.success(
        response.message ||
          `Operator status successfully updated to ${newStatus === "ACTIVE" ? "Active" : "Suspended"}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update operator status");
    }
  });
}

/**
 * 5. Query: Fetch Paginated & Filtered Admin Platform Bookings
 */
export function useAdminBookingsQuery(params?: IAdminBookingFilterParams) {
  return useQuery({
    queryKey: adminKeys.bookingList(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number> = {};
      if (params?.search && params.search.trim()) {
        cleanParams.search = params.search.trim();
      }
      if (params?.status && params.status !== "ALL" && params.status !== "all" && params.status.trim()) {
        cleanParams.status = params.status.toUpperCase();
      }
      if (params?.page) cleanParams.page = params.page;
      if (params?.limit) cleanParams.limit = params.limit;

      const response = await get<ApiResponse<IAdminBookingsResponseData>>("/admin/bookings", {
        params: cleanParams,
        signal
      });

      return (
        response.data ?? {
          meta: {
            page: params?.page ?? 1,
            limit: params?.limit ?? 10,
            total: 0,
            totalPages: 1
          },
          data: []
        }
      );
    },
    staleTime: 1000 * 30, // 30 seconds
    placeholderData: (previousData) => previousData
  });
}

/**
 * 6. Query: Fetch Single Admin Booking Details by Reference for Quick-View Modal
 */
export function useAdminBookingByRefQuery(reference: string | null) {
  return useQuery({
    queryKey: [...adminKeys.bookings(), "detail", reference],
    queryFn: async ({ signal }) => {
      if (!reference) return null;
      const response = await get<ApiResponse<IAdminBookingItem>>(`/admin/bookings/${encodeURIComponent(reference)}`, {
        signal
      });

      return response.data ?? null;
    },
    enabled: Boolean(reference && reference.trim().length >= 3),
    staleTime: 1000 * 30
  });
}


/**
 * 7. Query: Platform settings (commission rate, payout schedule, seat hold minutes). Spec 0001, AC-9.
 */
export function useAdminSettingsQuery() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IPlatformSettings>>("/admin/settings", { signal });
      return response.data;
    },
    staleTime: 1000 * 60
  });
}

/**
 * 8. Mutation: Update payment settings. Send only the fields that changed; the backend
 * rejects an empty body. A new commission rate applies to new bookings only.
 */
export function useUpdatePaymentSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: IUpdatePaymentSettingsPayload) => {
      return await patch<ApiResponse<IPlatformSettings>>("/admin/settings/commission", payload);
    },
    onSuccess: (response) => {
      if (response.data) {
        queryClient.setQueryData(adminKeys.settings(), response.data);
      }
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
      toast.success(response.message || "Payment settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update payment settings");
    }
  });
}

/**
 * 9. Query: Fetch Paginated & Filtered Admin Platform Payments & Revenue Overview
 */
export function useAdminPaymentsQuery(params?: IAdminPaymentsFilterParams) {
  return useQuery({
    queryKey: adminKeys.paymentList(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number> = {};
      if (params?.search && params.search.trim()) {
        cleanParams.search = params.search.trim();
      }
      if (params?.status && params.status !== "ALL" && params.status !== "all" && params.status.trim()) {
        cleanParams.status = params.status.toUpperCase();
      }
      if (params?.page) cleanParams.page = params.page;
      if (params?.limit) cleanParams.limit = params.limit;

      const response = await get<ApiResponse<IAdminPaymentsResponseData>>("/admin/payments", {
        params: cleanParams,
        signal
      });

      return (
        response.data ?? {
          overview: {
            totalBookingValue: 0,
            commission: 0,
            providerAmount: 0,
            commissionRate: 10
          },
          meta: {
            page: params?.page ?? 1,
            limit: params?.limit ?? 10,
            total: 0,
            totalPages: 1
          },
          data: []
        }
      );
    },
    staleTime: 1000 * 30, // 30 seconds
    placeholderData: (previousData) => previousData
  });
}
