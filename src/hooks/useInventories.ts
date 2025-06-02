// src/hooks/useInventories.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Inventory, UpdateInventoryArgs } from "../types"; // Adjust path
import { useEffect, useState } from "react"; // For useAuthUserId

// Re-use the useAuthUserId hook from useItems.ts or create a shared auth hook
const useAuthUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(); // Also capture error here
      if (error) {
        console.error("Error fetching user in useAuthUserId:", error);
      }
      setUserId(user?.id || null);
    };
    fetchUser();
    // No explicit dependencies needed here if fetchUser is stable or self-contained.
    // If you add other variables that 'fetchUser' depends on, they should be added here.
  }, []); // The empty array is correct if fetchUser doesn't depend on external changing values.
  return userId;
};

// Fetch all inventories for the logged-in user
export const useInventories = () => {
  const userId = useAuthUserId();
  return useQuery<Inventory[]>({
    queryKey: ["inventories", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("inventories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }); // Show newest first
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId,
  });
};

// Create a new inventory
export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId();
  return useMutation<
    Inventory, // Expected return type for successful mutation
    Error, // Expected error type
    { name: string; settings?: Record<string, unknown> } // Args type: use unknown for settings
  >({
    mutationFn: async (newInventory) => {
      // 'newInventory' is now implicitly typed from the Mutation
      if (!userId) throw new Error("User not authenticated.");
      const inventoryToInsert = { ...newInventory, user_id: userId };
      const { data, error } = await supabase
        .from("inventories")
        .insert(inventoryToInsert)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      // 'data' is now typed as Inventory
      queryClient.invalidateQueries({ queryKey: ["inventories", userId] });
    },
    // No onError specified, so no 'any' here.
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<Inventory, Error, UpdateInventoryArgs>({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from("inventories")
        .update({
          status: status,
          completed_at:
            status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // 'data' is Inventory, 'variables' is UpdateInventoryArgs
      // Invalidate queries to refetch the updated inventory list/details
      queryClient.invalidateQueries({ queryKey: ["inventories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.id] });
      console.log(`Inventory ${data.name} status updated to ${data.status}`);
    },
    onError: (error) => {
      // This was the line with 'any' before
      console.error("Error updating inventory status:", error.message);
    },
  });
};

// Delete an inventory
export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId();
  return useMutation<
    void, // Return type of the mutation (void because delete doesn't return data)
    Error, // Error type
    string // Argument type (inventoryId)
  >({
    mutationFn: async (inventoryId: string) => {
      // 'inventoryId' is now typed
      if (!userId) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from("inventories")
        .delete()
        .eq("id", inventoryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories", userId] });
    },
    // No onError specified, so no 'any' here.
  });
};
