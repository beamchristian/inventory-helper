// src/hooks/useInventories.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inventory } from "../types"; // Adjust path if necessary

// 1. Define the shape of the paginated API response
interface PaginatedInventoriesResponse {
  data: Inventory[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// 2. Define the props our hook will accept for pagination
interface UseInventoriesProps {
  page?: number;
  limit?: number;
  enabled?: boolean;
}
// Fetch all inventories for the logged-in user
// 3. Refactor the useInventories hook
export const useInventories = ({
  page = 1,
  limit = 10,
  enabled = true,
}: UseInventoriesProps) => {
  return useQuery<PaginatedInventoriesResponse>({
    // The queryKey is now unique for each page, which is crucial for caching
    queryKey: ["inventories", { page, limit }],
    queryFn: async () => {
      // Append page and limit to the fetch request
      const response = await fetch(
        `/api/inventories?page=${page}&limit=${limit}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch inventories.");
      }
      return response.json();
    },
    // The `enabled` flag is passed here, often controlled by session status
    enabled: enabled,
  });
};

// Create a new inventory
export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      newInventory: Omit<
        Inventory,
        "id" | "created_at" | "updated_at" | "user_id"
      >
    ) => {
      const response = await fetch("/api/inventories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newInventory),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add inventory.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
    },
  });
};

// Update an existing inventory
export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      updatedInventory: Partial<Inventory> & { id: string }
    ) => {
      const response = await fetch(`/api/inventories/${updatedInventory.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedInventory),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update inventory.");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.id] });
    },
  });
};

// Delete an inventory
export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inventoryId: string) => {
      const response = await fetch(`/api/inventories/${inventoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete inventory.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
    },
  });
};
