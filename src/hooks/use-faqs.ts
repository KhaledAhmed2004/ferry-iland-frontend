import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApiResponse,
  ICreateFaqPayload,
  IFaqFilterParams,
  IFaqItem,
  IFaqsResponseData,
  IUpdateFaqPayload
} from "@/types";
import { del, get, patch, post } from "@/lib/api";

export const faqKeys = {
  all: ["faqs"] as const,
  public: (params?: { search?: string; category?: string }) =>
    [...faqKeys.all, "public", params] as const,
  admin: (params?: IFaqFilterParams) =>
    [...faqKeys.all, "admin", params] as const,
  detail: (id: string) => [...faqKeys.all, "detail", id] as const
};

/**
 * Fetch public FAQs for Passenger Help Center (/help)
 */
export function usePublicFaqsQuery(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: faqKeys.public(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string> = {};
      if (params?.search && params.search.trim()) {
        cleanParams.search = params.search.trim();
      }
      if (params?.category && params.category !== "all" && params.category.trim()) {
        cleanParams.category = params.category.trim();
      }

      const response = await get<ApiResponse<IFaqsResponseData>>("/faqs/public", {
        params: cleanParams,
        signal
      });

      return (
        response.data ?? {
          meta: { page: 1, limit: 0, total: 0, totalPages: 1 },
          categories: [],
          data: []
        }
      );
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

/**
 * Fetch paginated & filtered FAQs for Admin Dashboard
 */
export function useAdminFaqsQuery(params?: IFaqFilterParams) {
  return useQuery({
    queryKey: faqKeys.admin(params),
    queryFn: async ({ signal }) => {
      const cleanParams: Record<string, string | number | boolean> = {};
      if (params?.search && params.search.trim()) {
        cleanParams.search = params.search.trim();
      }
      if (params?.category && params.category !== "all" && params.category.trim()) {
        cleanParams.category = params.category.trim();
      }
      if (typeof params?.isPublished === "boolean") {
        cleanParams.isPublished = params.isPublished;
      }
      if (params?.page) cleanParams.page = params.page;
      if (params?.limit) cleanParams.limit = params.limit;
      if (params?.sortBy) cleanParams.sortBy = params.sortBy;
      if (params?.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const response = await get<ApiResponse<IFaqsResponseData>>("/faqs", {
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
          categories: [],
          data: []
        }
      );
    },
    staleTime: 1000 * 30, // 30 seconds
    placeholderData: (previousData) => previousData
  });
}

/**
 * Mutation: Create a new FAQ item
 */
export function useCreateFaqMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ICreateFaqPayload) => {
      return await post<ApiResponse<IFaqItem>>("/faqs", payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.all });
      toast.success(response.message || "FAQ created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create FAQ");
    }
  });
}

/**
 * Mutation: Update an existing FAQ item
 */
export function useUpdateFaqMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: IUpdateFaqPayload }) => {
      return await patch<ApiResponse<IFaqItem>>(`/faqs/${id}`, payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.all });
      toast.success(response.message || "FAQ updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update FAQ");
    }
  });
}

/**
 * Mutation: Delete an FAQ item
 */
export function useDeleteFaqMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await del<ApiResponse<void>>(`/faqs/${id}`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.all });
      toast.success(response.message || "FAQ deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete FAQ");
    }
  });
}

/**
 * Mutation: Bulk publish / unpublish FAQs
 */
export function useBulkPublishFaqsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isPublished }: { ids: string[]; isPublished: boolean }) => {
      return await patch<ApiResponse<{ count: number }>>("/faqs/bulk/publish", {
        ids,
        isPublished
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.all });
      toast.success(response.message || "Bulk status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update bulk status");
    }
  });
}

/**
 * Mutation: Bulk reassign category for FAQs
 */
export function useBulkCategoryFaqsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, category }: { ids: string[]; category: string }) => {
      return await patch<ApiResponse<{ count: number }>>("/faqs/bulk/category", {
        ids,
        category
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.all });
      toast.success(response.message || "Bulk category updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update bulk category");
    }
  });
}

/**
 * Mutation: Bulk delete FAQs
 */
export function useBulkDeleteFaqsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return await post<ApiResponse<{ count: number }>>("/faqs/bulk/delete", {
        ids
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: faqKeys.all });
      toast.success(response.message || "Bulk FAQs deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete bulk FAQs");
    }
  });
}

