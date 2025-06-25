// src/hooks/useInventories.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions, // 1. Import the UseQueryOptions type
} from "@tanstack/react-query";
import { Inventory } from "../types"; // Adjust path if necessary

// Fetch all inventories for the logged-in user
// 2. Modified the function to accept optional parameters
export const useInventories = (
  options?: Omit<UseQueryOptions<Inventory[]>, "queryKey" | "queryFn">
) => {
  return useQuery<Inventory[]>({
    queryKey: ["inventories"],
    queryFn: async () => {
      const response = await fetch("/api/inventories");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch inventories.");
      }
      return response.json();
    },
    // 3. Spread the incoming options into the query.
    // This allows passing 'enabled', 'onSuccess', etc., from the component.
    ...options,
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
