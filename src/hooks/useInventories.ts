// src/hooks/useInventories.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inventory } from "../types"; // Adjust path

// Fetch all inventories for the logged-in user
export const useInventories = () => {
  return useQuery<Inventory[]>({
    queryKey: ["inventories"],
    queryFn: async () => {
      // No longer need this userId check, API route handles authentication
      // if (!userId) { return []; }

      const response = await fetch("/api/inventories"); // Call your new API route
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch inventories.");
      }
      return response.json();
    },
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
      // No user_id check here, it's added server-side
      // if (!userId) throw new Error("User not authenticated.");
      // const inventoryToInsert = { ...newInventory, user_id: userId }; // User ID added server-side

      const response = await fetch("/api/inventories", {
        // Call your new POST API route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newInventory), // Send only the data the API expects
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add inventory.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] }); // Invalidate and refetch
    },
  });
};

// Update an existing inventory
export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  // REMOVE THIS LINE: const userId = useAuthUserId(); // No longer needed here
  return useMutation({
    mutationFn: async (
      updatedInventory: Partial<Inventory> & { id: string }
    ) => {
      const response = await fetch(`/api/inventories/${updatedInventory.id}`, {
        // Call your new PATCH API route
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
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.id] }); // If you have a single inventory query
    },
  });
};

// Delete an inventory
export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  // REMOVE THIS LINE: const userId = useAuthUserId(); // No longer needed here
  return useMutation({
    mutationFn: async (inventoryId: string) => {
      // No user_id check here
      // if (!userId) throw new Error("User not authenticated.");

      const response = await fetch(`/api/inventories/${inventoryId}`, {
        // Call your new DELETE API route
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete inventory.");
      }
      // No data returned on successful delete
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
    },
    // No onError specified, so no 'any' here.
  });
};
