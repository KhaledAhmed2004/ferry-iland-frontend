import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ApiResponse,
  ICreateLegalPagePayload,
  ILegalPage,
  IUpdateLegalPagePayload
} from "@/types";
import { del, get, patch, post } from "@/lib/api";

export const legalKeys = {
  all: ["legals"] as const,
  lists: () => [...legalKeys.all, "list"] as const,
  details: () => [...legalKeys.all, "detail"] as const,
  detail: (identifier: string) => [...legalKeys.details(), identifier] as const
};

/**
 * 1. Query: List all legal documents (Terms, Privacy, etc.)
 */
export function useLegalPagesQuery() {
  return useQuery<ILegalPage[]>({
    queryKey: legalKeys.lists(),
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<ILegalPage[]>>("/legals", { signal });
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  });
}

/**
 * 2. Query: Fetch single legal document by slug or ID
 */
export function useLegalPageQuery(identifier: string) {
  return useQuery<ILegalPage | null>({
    queryKey: legalKeys.detail(identifier),
    queryFn: async ({ signal }) => {
      if (!identifier) return null;
      try {
        const response = await get<ApiResponse<ILegalPage>>(`/legals/${identifier}`, {
          signal
        });
        return response.data ?? null;
      } catch (err: unknown) {
        const apiErr = err as { status?: number; response?: { status?: number } };
        if (apiErr?.status === 404 || apiErr?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(identifier),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: unknown) => {
      const apiErr = error as { status?: number };
      if (apiErr?.status === 404) return false;
      return failureCount < 2;
    }
  });
}

/**
 * 3. Mutation: Create new legal document (Admin)
 */
export function useCreateLegalPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ICreateLegalPagePayload) => {
      return await post<ApiResponse<ILegalPage>>("/legals", payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: legalKeys.all });
      toast.success(response.message || "Legal document created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create legal document");
    }
  });
}

/**
 * 4. Mutation: Update legal document (Admin)
 */
export function useUpdateLegalPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload
    }: {
      id: string;
      payload: IUpdateLegalPagePayload;
    }) => {
      return await patch<ApiResponse<ILegalPage>>(`/legals/${id}`, payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: legalKeys.all });
      toast.success(response.message || "Legal document updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update legal document");
    }
  });
}

/**
 * 5. Mutation: Delete legal document (Admin)
 */
export function useDeleteLegalPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await del<ApiResponse<null>>(`/legals/${id}`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: legalKeys.all });
      toast.success(response.message || "Legal document deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete legal document");
    }
  });
}
