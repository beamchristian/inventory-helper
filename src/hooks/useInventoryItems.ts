// src/hooks/useInventoryItems.ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryItem, Item } from "@/types";
import { useSession } from "next-auth/react";

type SortParams = {
  column:
    | "name"
    | "unit_type"
    | "upc_number"
    | "counted_units"
    | "calculated_weight"
    | "brand"
    | "item_type";
  direction: "asc" | "desc";
};

type CombinedInventoryItem = InventoryItem & { item: Item };

const API_INVENTORY_ITEMS_BASE_URL = "/api/inventories";

/**
 * useInventoryItems Hook
 * Fetches all inventory items for a given inventory ID, with optional client-side sorting.
 */
export const useInventoryItems = (
  inventoryId: string | undefined,
  sort?: SortParams
) => {
  // Fixed: Only destructure `status` if `data` (sessionData) itself is not used directly
  const { status } = useSession(); // Renamed to sessionInfo for clarity

  return useQuery<CombinedInventoryItem[]>({
    queryKey: ["inventoryItems", inventoryId, sort],
    queryFn: async () => {
      if (!inventoryId) {
        throw new Error("Inventory ID is missing.");
      }
      if (status !== "authenticated") {
        throw new Error("Authentication required to fetch inventory items.");
      }

      const response = await fetch(
        `${API_INVENTORY_ITEMS_BASE_URL}/${inventoryId}/items`
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message ||
            `Failed to fetch inventory items: ${response.status}`
        );
      }
      const data: CombinedInventoryItem[] = await response.json();

      const sortableItems = [...data];

      if (sort && sort.column) {
        sortableItems.sort((a, b) => {
          let aValue: string | number | null | undefined;
          let bValue: string | number | null | undefined;

          switch (sort.column) {
            case "name":
              aValue = a.item.name;
              bValue = b.item.name;
              break;
            case "unit_type":
              aValue = a.item.unit_type;
              bValue = b.item.unit_type;
              break;
            case "upc_number":
              aValue = a.item.upc_number;
              bValue = b.item.upc_number;
              break;
            case "counted_units":
              aValue = a.counted_units;
              bValue = b.counted_units;
              break;
            case "calculated_weight":
              aValue =
                (a.counted_units || 0) * (a.item.average_weight_per_unit || 0);
              bValue =
                (b.counted_units || 0) * (b.item.average_weight_per_unit || 0);
              break;
            case "brand":
              aValue = a.item.brand;
              bValue = b.item.brand;
              break;
            case "item_type":
              aValue = a.item.item_type;
              bValue = b.item.item_type;
              break;
            default:
              aValue = a.item.name;
              bValue = b.item.name;
          }

          if (aValue === null || aValue === undefined)
            return sort.direction === "asc" ? 1 : -1;
          if (bValue === null || bValue === undefined)
            return sort.direction === "asc" ? -1 : 1;

          if (typeof aValue === "string" && typeof bValue === "string") {
            return sort.direction === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }
          if (typeof aValue === "number" && typeof bValue === "number") {
            return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
          }
          const valA = String(aValue);
          const valB = String(bValue);
          return sort.direction === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        });
      }
      return sortableItems;
    },
    enabled: !!inventoryId && status === "authenticated",
  });
};

/**
 * useAddInventoryItem Hook
 * Adds a new inventory item (single).
 */
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession(); // Keep sessionData here as `sessionData?.user?.id` is used

  return useMutation<
    CombinedInventoryItem,
    Error,
    { inventory_id: string; item_id: string; counted_units: number }
  >({
    mutationFn: async (newItemData) => {
      if (!sessionData?.user?.id) {
        throw new Error("User not authenticated.");
      }
      const response = await fetch(
        `${API_INVENTORY_ITEMS_BASE_URL}/${newItemData.inventory_id}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItemData),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message ||
            `Failed to add item to inventory: ${response.status}`
        );
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventory_id],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventory_id],
      });
    },
    onError: (error) => {
      console.error("Error adding inventory item:", error);
    },
  });
};

/**
 * useAddAllInventoryItems Hook
 * Adds all remaining available master items to a specific inventory.
 */
export const useAddAllInventoryItems = () => {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession(); // Keep sessionData here as `sessionData?.user?.id` is used

  return useMutation<number, Error, string>({
    mutationFn: async (inventoryId) => {
      if (!sessionData?.user?.id) {
        throw new Error("User not authenticated.");
      }
      const response = await fetch(
        `${API_INVENTORY_ITEMS_BASE_URL}/${inventoryId}/items/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message ||
            `Failed to add all items to inventory: ${response.status}`
        );
      }
      const result = await response.json();
      return result.countAdded;
    },
    onSuccess: (countAdded, inventoryId) => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", inventoryId],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      console.log(
        `Successfully added ${countAdded} items to inventory ${inventoryId}.`
      );
    },
    onError: (error) => {
      console.error("Error adding all inventory items:", error);
    },
  });
};

/**
 * useDeleteInventoryItem Hook
 * Deletes an inventory item.
 */
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession(); // Keep sessionData here as `sessionData?.user?.id` is used

  return useMutation<
    void,
    Error,
    { inventoryItemId: string; inventoryId: string }
  >({
    mutationFn: async ({ inventoryItemId, inventoryId }) => {
      if (!sessionData?.user?.id) {
        throw new Error("User not authenticated.");
      }
      const response = await fetch(
        `${API_INVENTORY_ITEMS_BASE_URL}/${inventoryId}/items`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryItemId }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message ||
            `Failed to delete inventory item: ${response.status}`
        );
      }
      return;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventoryId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventoryId],
      });
    },
    onError: (error) => {
      console.error("Error deleting inventory item:", error);
    },
  });
};

/**
 * useUpdateInventoryItem Hook
 * Updates an existing inventory item's count.
 */
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession(); // Keep sessionData here as `sessionData?.user?.id` is used

  return useMutation<
    CombinedInventoryItem,
    Error,
    { id: string; counted_units: number; inventory_id: string }
  >({
    mutationFn: async (updatedItem) => {
      if (!sessionData?.user?.id) {
        throw new Error("User not authenticated.");
      }
      const response = await fetch(
        `${API_INVENTORY_ITEMS_BASE_URL}/${updatedItem.inventory_id}/items/${updatedItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ counted_units: updatedItem.counted_units }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message ||
            `Failed to update inventory item: ${response.status}`
        );
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItem", data.id] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", variables.inventory_id],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.inventory_id],
      });
    },
    onError: (error) => {
      console.error("Error updating inventory item:", error);
    },
  });
};
