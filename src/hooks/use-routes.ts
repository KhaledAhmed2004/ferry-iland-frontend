import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApiResponse,
  IConnectedPort,
  ICreatePortPayload,
  ICreateRoutePayload,
  IPopularJourney,
  IPopularRoutesParams,
  IPort,
  IPortListResponse,
  IRoute,
  IRouteFilterParams,
  IRouteListResponse,
  IUpdatePortPayload,
  IUpdateRoutePayload,
  RouteStatus
} from "@/types";

import { del, get, patch, post } from "@/lib/api";

/**
 * Route & Port Query Key Factory
 */
export const routeKeys = {
  all: ["routes"] as const,
  lists: () => [...routeKeys.all, "list"] as const,
  list: (params?: IRouteFilterParams) => [...routeKeys.lists(), params] as const,
  popular: (params?: IPopularRoutesParams) => [...routeKeys.all, "popular", params] as const,
  details: () => [...routeKeys.all, "detail"] as const,
  detail: (id: string) => [...routeKeys.details(), id] as const,
  ports: ["ports"] as const,
  connectedPorts: ["routes", "connected-ports"] as const,
  adminPorts: (params?: Record<string, unknown>) => ["admin", "ports", params] as const
};

/**
 * 1. Query: Fetch Operator Routes with optional status and pagination
 */
export function useRoutesQuery(params?: IRouteFilterParams) {
  return useQuery({
    queryKey: routeKeys.list(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number> = {};
      if (params?.status && params.status !== "ALL" && params.status.trim()) {
        cleanParams.status = params.status;
      }
      if (params?.search && params.search.trim()) {
        cleanParams.search = params.search.trim();
      }
      if (params?.page) cleanParams.page = params.page;
      if (params?.limit) cleanParams.limit = params.limit;

      const response = await get<ApiResponse<IRouteListResponse>>("/routes", {
        params: cleanParams,
        signal
      });

      const routesData = response.data;
      const routesList = Array.isArray(routesData?.routes) ? routesData.routes : [];
      const pagination = routesData?.pagination;

      return {
        routes: routesList,
        pagination
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message.includes("token") ||
          error.message.includes("Authorization") ||
          error.message.includes("401"))
      ) {
        return false;
      }
      return failureCount < 1;
    }
  });
}

/**
 * 2. Query: Fetch Available Ports for Route Configuration
 */
export function usePortsQuery() {
  return useQuery({
    queryKey: routeKeys.ports,
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IPortListResponse>>("/ports", {
        params: { limit: 100, isActive: true },
        signal
      });

      const portList = response.data?.data ?? [];
      return portList as IPort[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache for ports
    refetchOnWindowFocus: false,
    retry: 1
  });
}

/**
 * 3. Mutation: Create New Ferry Route
 */
export function useCreateRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ICreateRoutePayload) => {
      return await post<ApiResponse<IRoute>>("/routes", payload);
    },
    onSuccess: async (response) => {
      if (response.data) {
        const createdRoute = response.data;
        queryClient.setQueriesData<{ routes: IRoute[]; pagination?: unknown }>(
          { queryKey: routeKeys.lists() },
          (oldData) => {
            if (!oldData) return { routes: [createdRoute] };
            return {
              ...oldData,
              routes: [createdRoute, ...oldData.routes.filter((r) => r.id !== createdRoute.id)]
            };
          }
        );
      }

      await queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "all" });
      await queryClient.refetchQueries({ queryKey: routeKeys.all });

      toast.success(response.message || "Route created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create route");
    }
  });
}

/**
 * 4. Mutation: Update Route Details
 */
export function useUpdateRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: IUpdateRoutePayload;
    }) => {
      return await patch<ApiResponse<IRoute>>(`/routes/${id}`, payload);
    },
    onSuccess: async (response) => {
      if (response.data) {
        const updatedRoute = response.data;
        queryClient.setQueriesData<{ routes: IRoute[]; pagination?: unknown }>(
          { queryKey: routeKeys.lists() },
          (oldData) => {
            if (!oldData) return { routes: [updatedRoute] };
            return {
              ...oldData,
              routes: oldData.routes.map((r) => (r.id === updatedRoute.id ? updatedRoute : r))
            };
          }
        );
      }

      await queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "all" });
      await queryClient.refetchQueries({ queryKey: routeKeys.all });

      toast.success(response.message || "Route updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update route");
    }
  });
}

/**
 * 5. Mutation: Delete Route
 */
export function useDeleteRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await del<ApiResponse<null>>(`/routes/${id}`);
    },
    onSuccess: async (response, deletedId) => {
      queryClient.setQueriesData<{ routes: IRoute[]; pagination?: unknown }>(
        { queryKey: routeKeys.lists() },
        (oldData) => {
          if (!oldData) return { routes: [] };
          return {
            ...oldData,
            routes: oldData.routes.filter((r) => r.id !== deletedId)
          };
        }
      );

      await queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "all" });
      await queryClient.refetchQueries({ queryKey: routeKeys.all });

      toast.success(response?.message || "Route deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete route");
    }
  });
}

/**
  * 5b. Mutation: Bulk Update Route Status
  */
export function useBulkUpdateRouteStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { ids: string[]; status: RouteStatus }) => {
      return await patch<ApiResponse<{ count: number }>>("/routes/bulk-status", payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "all" });
      await queryClient.refetchQueries({ queryKey: routeKeys.all });
      toast.success(response?.message || `Successfully updated ${response?.data?.count ?? "all"} routes!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update routes");
    }
  });
}

/**
  * 5c. Mutation: Bulk Delete Routes
  */
export function useBulkDeleteRoutesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return await post<
        ApiResponse<{
          count: number;
          deletedCount?: number;
          skippedCount?: number;
          skippedRoutes?: string[];
        }>
      >("/routes/bulk-delete", { ids });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "all" });
      await queryClient.refetchQueries({ queryKey: routeKeys.all });

      const data = response?.data;
      if (data?.skippedCount && data.skippedCount > 0) {
        toast.warning(
          response?.message ||
            `Deleted ${data.count} routes. ${data.skippedCount} routes were skipped due to active passenger bookings.`
        );
      } else {
        toast.success(
          response?.message || `Successfully deleted ${data?.count ?? "all"} routes!`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete routes");
    }
  });
}

/**
 * 6. Query: Fetch Connected Ports (Customer Booking Search)
 * Returns active departure ports along with their connected destination ports
 */
export function useConnectedPortsQuery() {
  return useQuery({
    queryKey: routeKeys.connectedPorts,
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IConnectedPort[]>>("/routes/ports", {
        signal
      });
      return response.data ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });
}

/**
 * 7. Query: Fetch Popular Routes (Public Landing Page Showcase)
 * Retrieves top curated and booked ferry routes with live schedules & fares
 */
export function usePopularRoutesQuery(params?: IPopularRoutesParams) {
  return useQuery<IPopularJourney[]>({
    queryKey: routeKeys.popular(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number> = {};
      if (params?.limit) cleanParams.limit = params.limit;
      if (params?.category && params.category !== "all") {
        cleanParams.category = params.category;
      }

      const response = await get<ApiResponse<IPopularJourney[]>>("/routes/popular", {
        params: cleanParams,
        signal
      });

      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 1
  });
}

/**
 * 8. Query: Fetch Admin Ports (Paginated & Filterable)
 */
export function useAdminPortsQuery(params?: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  search?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: routeKeys.adminPorts(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number | boolean> = {};
      if (params?.page) cleanParams.page = params.page;
      if (params?.limit) cleanParams.limit = Math.min(params.limit, 100);
      const searchQuery = params?.search || params?.searchTerm;
      if (searchQuery) {
        cleanParams.search = searchQuery;
        cleanParams.searchTerm = searchQuery;
      }
      if (typeof params?.isActive === "boolean") cleanParams.isActive = params.isActive;

      const response = await get<ApiResponse<IPortListResponse>>("/ports", {
        params: cleanParams,
        signal
      });

      return (
        response.data ?? {
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 1 }
        }
      );
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true
  });
}

/**
 * 8. Mutation: Super Admin Create Port
 */
export function useCreatePortMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ICreatePortPayload) => {
      return await post<ApiResponse<IPort>>("/ports", payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: routeKeys.ports });
      await queryClient.invalidateQueries({ queryKey: routeKeys.connectedPorts });
      await queryClient.invalidateQueries({ queryKey: ["admin", "ports"] });
      toast.success(response.message || "Port created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create port");
    }
  });
}

/**
 * 9. Mutation: Super Admin Update Port
 */
export function useUpdatePortMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: IUpdatePortPayload;
    }) => {
      return await patch<ApiResponse<IPort>>(`/ports/${id}`, payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: routeKeys.ports });
      await queryClient.invalidateQueries({ queryKey: routeKeys.connectedPorts });
      await queryClient.invalidateQueries({ queryKey: ["admin", "ports"] });
      toast.success(response.message || "Port updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update port");
    }
  });
}

/**
 * 10. Mutation: Super Admin Delete Port
 */
export function useDeletePortMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await del<ApiResponse<null>>(`/ports/${id}`);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: routeKeys.ports });
      await queryClient.invalidateQueries({ queryKey: routeKeys.connectedPorts });
      await queryClient.invalidateQueries({ queryKey: ["admin", "ports"] });

      if (response?.message?.toLowerCase().includes("deactivated")) {
        toast.info(response.message);
      } else {
        toast.success(response?.message || "Port permanently deleted successfully!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete port");
    }
  });
}

