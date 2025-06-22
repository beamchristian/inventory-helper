// src/hooks/useAddItem.ts (If this is a separate file from useItems.ts)
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Item } from "../types"; // Ensure you have your Item type defined in src/types.ts

// Define the shape of the data needed to create a new item
// Omit 'id', 'created_at', and 'user_id' as they are generated/provided by the hook/API
type NewItemData = Omit<Item, "id" | "created_at" | "user_id">;

export const useAddItem = () => {
  const queryClient = useQueryClient();

  return useMutation<Item, Error, NewItemData, unknown>({
    mutationFn: async (newItem: NewItemData) => {
      const dataToInsert = {
        ...newItem,
        // REMOVE: user_id: user.id, // User ID is added in the API route
        average_weight_per_unit:
          newItem.unit_type === "quantity"
            ? null // Set to null if quantity type
            : newItem.average_weight_per_unit,
      };

      // Call your API route for adding items
      const response = await fetch("/api/items", {
        // This calls the POST /api/items route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToInsert), // Send the prepared data
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add item.");
      }
      const data: Item = await response.json(); // Ensure it returns the full Item
      return data;
    },
    onSuccess: () => {
      // Invalidate the 'items' query key to force a refetch of the master items list
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error) => {
      console.error("Error in useAddItem mutation:", error);
    },
  });
};
