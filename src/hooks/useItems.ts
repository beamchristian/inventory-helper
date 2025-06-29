// src/hooks/useItems.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Item } from "@/types";

// Define the shape of the paginated API response
interface PaginatedItemsResponse {
  data: Item[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Define the props our hook will accept for pagination
interface UseItemsProps {
  page?: number;
  limit?: number;
}

// --- HELPER FUNCTION ---
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }
  return response.json();
};

// --- HOOKS ---

/**
 * useItems Hook (FOR PAGINATED DATA)
 * Fetches a single page of master items. Used for the Settings page table.
 */
export const useItems = ({ page = 1, limit = 10 }: UseItemsProps = {}) => {
  const { status } = useSession();
  return useQuery<PaginatedItemsResponse>({
    queryKey: ["items", { page, limit }],
    queryFn: async () => {
      if (status !== "authenticated")
        throw new Error("Authentication required.");
      const response = await fetch(`/api/items?page=${page}&limit=${limit}`);
      return handleApiResponse(response);
    },
    enabled: status === "authenticated",
  });
};

/**
 * useAllItems Hook (FOR NON-PAGINATED DATA)
 * Fetches ALL master items. Used for dropdowns and lists where all options are needed.
 */
export const useAllItems = () => {
  const { status } = useSession();
  return useQuery<Item[]>({
    // Returns a simple array of items
    queryKey: ["items", "all"], // A different key to distinguish from paginated queries
    queryFn: async () => {
      if (status !== "authenticated")
        throw new Error("Authentication required.");
      // Calls the API with a flag to get all items
      const response = await fetch(`/api/items?all=true`);
      return handleApiResponse(response);
    },
    enabled: status === "authenticated",
  });
};

/**
 * useAddItem Hook
 * Invalidate the general 'items' query key to force a refetch of any page.
 */
export const useAddItem = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation<
    Item,
    Error,
    Omit<Item, "id" | "created_at" | "updated_at" | "user_id">
  >({
    mutationFn: async (newItemData) => {
      if (!session?.user?.id) throw new Error("User not authenticated.");
      const itemWithUserId = { ...newItemData, user_id: session.user.id };
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemWithUserId),
      });
      return handleApiResponse(response);
    },
    onSuccess: () => {
      // This invalidates all queries that start with 'items',
      // ensuring any viewed page is updated correctly.
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};

/**
 * useUpdateItem Hook
 * Invalidation logic remains the same.
 */
export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation<Item, Error, Item>({
    mutationFn: async (updatedItemData) => {
      if (!updatedItemData.id)
        throw new Error("Item ID is required for update.");
      const response = await fetch(`/api/items/${updatedItemData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItemData),
      });
      return handleApiResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};

/**
 * useDeleteItem Hook
 * Invalidation logic remains the same.
 */
export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
      });
      // A successful DELETE might not return a body, so we handle that
      if (!response.ok)
        return Promise.reject(await handleApiResponse(response));
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};
