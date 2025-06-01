// src/hooks/useInventoryItems.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { InventoryItem, Item } from "../types";
import { useEffect, useState } from "react";

// For fetching ALL inventory items for a given inventory
export const useInventoryItems = (inventoryId: string | undefined) => {
  const [userId, setUserId] = useState<string | null>(null); // Add useState

  useEffect(() => {
    // Add useEffect to get user
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  return useQuery<Array<InventoryItem & { items: Item }>>({
    queryKey: ["inventoryItems", inventoryId],
    queryFn: async () => {
      if (!inventoryId || !userId)
        throw new Error(
          "Inventory ID or User ID is missing for inventory items."
        );
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`*, items(*)`) // Select inventory_items and join with items table
        .eq("inventory_id", inventoryId)
        .order("created_at", { ascending: true }); // Order them for consistent navigation

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!inventoryId && !!userId, // Only run query when IDs are available
  });
};

interface AddInventoryItemArgs {
  inventory_id: string;
  item_id: string;
  counted_units: number;
}

export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    InventoryItem & { items: Item }, // UPDATED: Ensure the mutation returns the joined 'items' data
    Error,
    AddInventoryItemArgs
  >({
    mutationFn: async (newItem) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(newItem)
        .select(`*, items(*)`) // MODIFIED: To also fetch joined item data
        .single();

      if (error) {
        // Enhance the error object to include the Supabase error code
        const customError = new Error(error.message) as Error & {
          code?: string;
        };
        customError.code = error.code; // Add the code
        throw customError;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", data.inventory_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", data.inventory_id],
      }); // Invalidate parent inventory to update total weight if it's displayed
    },
    onError: (error) => {
      console.error("Error adding inventory item:", error.message);
    },
  });
};

interface UpdateInventoryItemArgs {
  id: string;
  counted_units: number;
  inventory_id: string; // Needed for query invalidation
}

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    InventoryItem & { items: Item }, // UPDATED: Ensure the mutation returns the joined 'items' data
    Error,
    UpdateInventoryItemArgs
  >({
    mutationFn: async ({ id, counted_units }) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .update({ counted_units: counted_units })
        .eq("id", id)
        .select(`*, items(*)`) // MODIFIED: To also fetch joined item data for consistency
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventory_id],
      });
      queryClient.invalidateQueries({ queryKey: ["inventoryItem", data.id] }); // Invalidate the specific item being updated
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventory_id],
      }); // Invalidate parent inventory
    },
    onError: (error) => {
      console.error("Error updating inventory item:", error.message);
    },
  });
};

interface DeleteInventoryItemArgs {
  inventoryItemId: string;
  inventoryId: string; // Needed for query invalidation
}

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteInventoryItemArgs>({
    mutationFn: async ({ inventoryItemId }) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", inventoryItemId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventoryId],
      }); // Invalidate parent inventory
    },
    onError: (error) => {
      console.error("Error deleting inventory item:", error.message);
    },
  });
};
