import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApiResponse,
  IAdminUserItem,
  IUserStatsResponse,
  UserFilterParams
} from "@/types";
import { get, patch } from "@/lib/api";
import { fetchAllPages } from "@/lib/fetch-all-pages";

/**
 * Users Query Key Factory
 */
export const userKeys = {
  all: ["users"] as const,
  stats: () => [...userKeys.all, "stats"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params?: UserFilterParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const
};

/**
 * 1. Query: Fetch Paginated & Filtered Platform Users (Customers, Operators, Admins)
 */
async function fetchUsersPage(params?: UserFilterParams, signal?: AbortSignal) {
  const cleanParams: Record<string, string | number> = {};

  const searchVal = (params?.searchTerm || params?.search || "").trim();
  if (searchVal) {
    cleanParams.searchTerm = searchVal;
  }

  if (params?.role && params.role !== "ALL" && params.role !== "all" && params.role.trim()) {
    cleanParams.role = params.role.trim();
  }

  if (params?.status && params.status !== "ALL" && params.status !== "all" && params.status.trim()) {
    cleanParams.status = params.status.trim();
  }

  if (params?.page) cleanParams.page = params.page;
  if (params?.limit) cleanParams.limit = Math.min(params.limit, 100);

  // The users endpoint takes a single `sort` param: "-name" = name desc. Newest-first
  // breaks ties so rows don't jump between pages.
  if (params?.sortBy) {
    const primary = `${params.sortOrder === "desc" ? "-" : ""}${params.sortBy}`;
    cleanParams.sort = params.sortBy === "createdAt" ? primary : `${primary},-createdAt`;
  }

  const response = await get<
    ApiResponse<IAdminUserItem[]> & {
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPage?: number;
        totalPages?: number;
      };
    }
  >("/users", {
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
    : response.meta ?? {
        page: 1,
        limit: 10,
        total: (response.data ?? []).length,
        totalPages: 1
      };

  return {
    users: response.data ?? [],
    meta: normalizedMeta
  };
}

export function useUsersQuery(params?: UserFilterParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => fetchUsersPage(params, signal),
    staleTime: 0,
    placeholderData: (previousData) => previousData
  });
}

/** Every user matching the filters (ignores page/limit) — for "select all across pages". */
export function fetchAllUsers(params?: Omit<UserFilterParams, "page" | "limit">) {
  return fetchAllPages(async (page, limit) => {
    const { users, meta } = await fetchUsersPage({ ...params, page, limit });
    return { items: users, totalPages: meta?.totalPages ?? meta?.totalPage ?? 1 };
  });
}

/**
 * 2. Query: Fetch Single User Details by ID
 */
export function useUserDetailQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IAdminUserItem>>(`/users/${userId}`, {
        signal
      });
      return response.data;
    },
    enabled: Boolean(userId) && enabled,
    staleTime: 1000 * 60 * 3
  });
}

/**
 * 3. Query: Fetch Platform User & Passenger Aggregated Statistics
 */
export function useUserStatsQuery() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<IUserStatsResponse>>("/users/stats", {
        signal
      });
      return response.data;
    },
    staleTime: 1000 * 30
  });
}

/**
 * 4. Mutation: Update User / Passenger Operational Status (ACTIVE / SUSPENDED)
 */
export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status
    }: {
      userId: string;
      status: "ACTIVE" | "SUSPENDED";
    }) => {
      return await patch<ApiResponse<IAdminUserItem>>(`/users/${userId}/status`, {
        status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    }
  });
}
