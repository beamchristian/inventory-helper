import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InventoryItem, Item } from "@/types";

// Define a type for sorting parameters
type SortParams = {
  column:
    | "name" // Refers to items.name
    | "unit_type" // Refers to items.unit_type
    | "upc_number" // Refers to items.upc_number
    | "counted_units" // Refers to inventory_items.counted_units
    | "calculated_weight" // This is a derived property
    | "brand" // Refers to items.brand
    | "item_type"; // Refers to items.item_type
  direction: "asc" | "desc";
};

/**
 * useInventoryItems Hook
 * Fetches all inventory items for a given inventory ID, with optional sorting.
 * All sorting is handled client-side after fetching.
 * @param {string | undefined} inventoryId - The ID of the inventory.
 * @param {SortParams} [sort] - Optional sorting parameters (column and direction).
 * @returns {object} TanStack Query result object.
 */
export const useInventoryItems = (
  inventoryId: string | undefined,
  sort?: SortParams // Keep sort parameter here
) => {
  return useQuery<Array<InventoryItem & { items: Item }>>({
    // IMPORTANT: Include 'sort' in queryKey so React Query knows to refetch when sort changes
    // This makes the cache key unique for each sorting combination.
    queryKey: ["inventoryItems", inventoryId, sort], // Re-added sort here!
    queryFn: async () => {
      if (!inventoryId) throw new Error("Inventory ID is missing.");

      // Fetch data without applying server-side sorting (Supabase will return default order)
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`*, items(*)`) // Select inventory_item and join with its related item
        .eq("inventory_id", inventoryId);

      if (error) throw new Error(error.message);
      if (!data) return []; // Return empty array if no data

      // --- Client-side Sorting Logic ---
      const sortableItems = [...data]; // Create a shallow copy to avoid mutating cache directly

      if (sort && sort.column) {
        sortableItems.sort((a, b) => {
          let aValue: string | number | null | undefined;
          let bValue: string | number | null | undefined;

          // Determine the values to compare based on the sortColumn
          switch (sort.column) {
            case "name":
              aValue = a.items.name;
              bValue = b.items.name;
              break;
            case "unit_type":
              aValue = a.items.unit_type;
              bValue = b.items.unit_type;
              break;
            case "upc_number":
              aValue = a.items.upc_number;
              bValue = b.items.upc_number;
              break;
            case "counted_units":
              aValue = a.counted_units;
              bValue = b.counted_units;
              break;
            case "calculated_weight":
              // Calculate on the fly for sorting
              aValue =
                (a.counted_units || 0) * (a.items.average_weight_per_unit || 0);
              bValue =
                (b.counted_units || 0) * (b.items.average_weight_per_unit || 0);
              break;
            case "brand":
              aValue = a.items.brand;
              bValue = b.items.brand;
              break;
            case "item_type":
              aValue = a.items.item_type;
              bValue = b.items.item_type;
              break;
            default:
              // Fallback to sorting by name if an unknown column is provided
              aValue = a.items.name;
              bValue = b.items.name;
          }

          // Handle null/undefined values: push them to the end (or beginning)
          // Consistent behavior: nulls/undefineds appear after valid values for ASC, before for DESC
          if (aValue === null || aValue === undefined)
            return sort.direction === "asc" ? 1 : -1;
          if (bValue === null || bValue === undefined)
            return sort.direction === "asc" ? -1 : 1;

          // Perform comparison based on value type
          if (typeof aValue === "string" && typeof bValue === "string") {
            return sort.direction === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }

          if (typeof aValue === "number" && typeof bValue === "number") {
            return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
          }

          // Fallback for mixed types or other unhandled types (convert to string for comparison)
          const valA = String(aValue);
          const valB = String(bValue);
          return sort.direction === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        });
      }

      return sortableItems;
    },
    enabled: !!inventoryId,
  });
};

/**
 * useAddInventoryItem Hook
 * Adds a new inventory item.
 */
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: {
      inventory_id: string;
      item_id: string;
      counted_units: number;
    }) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(newItem)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate all inventoryItems queries for this inventory_id regardless of sort order
      // This ensures that when a new item is added, all cached sorted lists are considered stale
      // and will re-fetch and re-sort if accessed.
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventory_id],
        exact: false, // Invalidate all queries starting with ["inventoryItems", inventory_id]
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventory_id],
      });
    },
  });
};

/**
 * useDeleteInventoryItem Hook
 * Deletes an inventory item.
 */
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inventoryItemId,
      inventoryId,
    }: {
      inventoryItemId: string;
      inventoryId: string;
    }) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", inventoryItemId);
      if (error) throw new Error(error.message);
      return inventoryItemId;
    },
    onSuccess: (_, variables) => {
      // Invalidate all inventoryItems queries for this inventory_id regardless of sort order
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventoryId],
        exact: false, // Invalidate all queries starting with ["inventoryItems", inventoryId]
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventoryId],
      });
    },
  });
};

/**
 * useUpdateInventoryItem Hook
 * Updates an existing inventory item's count.
 */
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updatedItem: {
      id: string;
      counted_units: number;
      inventory_id: string; // Include inventory_id for invalidation
    }) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .update({ counted_units: updatedItem.counted_units })
        .eq("id", updatedItem.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific inventory item
      queryClient.invalidateQueries({ queryKey: ["inventoryItem", data.id] });
      // Invalidate all inventoryItems queries for this inventory_id regardless of sort order
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventory_id],
        exact: false, // Invalidate all queries starting with ["inventoryItems", inventory_id]
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventory_id],
      });
    },
  });
};
