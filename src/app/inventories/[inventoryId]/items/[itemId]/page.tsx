// src/app/inventories/[inventoryId]/items/[itemId]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InventoryItem, Item } from "@/types";
// Corrected import: Import useInventoryItems directly from its file
import {
  useInventoryItems,
  useUpdateInventoryItem,
} from "@/hooks/useInventoryItems";

/**
 * useInventoryItemDetails Hook
 * Fetches details for a specific inventory item, including its associated master item data.
 * @param {string | undefined} itemId - The ID of the inventory item to fetch.
 * @returns {object} TanStack Query result object.
 */
const useInventoryItemDetails = (itemId: string | undefined) => {
  return useQuery<InventoryItem & { items: Item }>({
    queryKey: ["inventoryItem", itemId],
    queryFn: async () => {
      if (!itemId) throw new Error("Inventory Item ID is missing.");

      const { data, error } = await supabase
        .from("inventory_items")
        .select(`*, items(*)`) // Select inventory_item and join with its related item
        .eq("id", itemId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Inventory item not found.");
      return data;
    },
    enabled: !!itemId,
  });
};

/**
 * InventoryItemDetailPage Component
 * Renders the detailed view for a single inventory item, allows editing its count,
 * and provides navigation to the next/previous item in the inventory.
 */
export default function InventoryItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.inventoryId as string;
  const itemId = params.itemId as string; // This is the inventory_item ID, not the master item ID

  const queryClient = useQueryClient();

  const {
    data: inventoryItem,
    isLoading: isInventoryItemLoading,
    isError: isInventoryItemError,
    error: inventoryItemError,
  } = useInventoryItemDetails(itemId);

  // Corrected: Call useInventoryItems directly
  const {
    data: allInventoryItems,
    isLoading: areAllItemsLoading,
    isError: areAllItemsError,
    error: allItemsError,
  } = useInventoryItems(inventoryId);

  const updateInventoryItemMutation = useUpdateInventoryItem();

  const [editingCount, setEditingCount] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (inventoryItem) {
      setEditingCount(inventoryItem.counted_units);
    }
  }, [inventoryItem]);

  const handleUpdateCount = async (newCount: number) => {
    if (!inventoryItem?.id || !inventoryItem.inventory_id) return;

    if (isNaN(newCount) || newCount < 0) {
      alert("Count must be a non-negative number.");
      return;
    }

    if (
      inventoryItem.items.unit_type === "quantity" &&
      !Number.isInteger(newCount)
    ) {
      alert("Quantity items must have whole number counts.");
      setEditingCount(Math.floor(newCount)); // Keep the UI value integer
      return;
    }

    try {
      await updateInventoryItemMutation.mutateAsync({
        id: inventoryItem.id,
        counted_units: newCount,
        inventory_id: inventoryItem.inventory_id,
      });
      // Invalidate the specific item and the list to ensure all data is fresh
      queryClient.invalidateQueries({ queryKey: ["inventoryItem", itemId] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryItems", inventoryId],
      });

      alert("Item count updated successfully!");
    } catch (err) {
      alert(
        `Error updating count: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const currentIndex = allInventoryItems?.findIndex(
    (item) => item.id === itemId
  );
  const totalItems = allInventoryItems?.length || 0;

  const navigateToItem = (index: number) => {
    if (allInventoryItems && index >= 0 && index < totalItems) {
      const nextOrPrevItem = allInventoryItems[index];
      router.push(`/inventories/${inventoryId}/items/${nextOrPrevItem.id}`);
    }
  };

  const handlePrevious = () => {
    if (currentIndex !== undefined && currentIndex > 0) {
      navigateToItem(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex !== undefined && currentIndex < totalItems - 1) {
      navigateToItem(currentIndex + 1);
    }
  };

  const isFirstItem = currentIndex === 0;
  const isLastItem = currentIndex === totalItems - 1;

  if (isInventoryItemLoading || areAllItemsLoading) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (isInventoryItemError) {
    return (
      <div className='text-red-500 text-center mt-8'>
        Error loading item: {inventoryItemError?.message}
      </div>
    );
  }

  if (areAllItemsError) {
    return (
      <div className='text-red-500 text-center mt-8'>
        Error loading inventory items list: {allItemsError?.message}
      </div>
    );
  }

  if (!inventoryItem) {
    return (
      <div className='text-center mt-8 text-gray-600'>
        Inventory item not found.
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4 max-w-2xl'>
      <header className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-gray-800'>
          Viewing Item: {inventoryItem.items.name}
        </h1>
        <button
          onClick={() => router.push(`/inventories/${inventoryId}`)}
          className='bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow-md'
        >
          Back to Inventory
        </button>
      </header>

      <main className='bg-white p-6 rounded-lg shadow-md'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-lg mb-6'>
          <p>
            <span className='font-semibold'>Item Name:</span>{" "}
            {inventoryItem.items.name}
          </p>
          <p>
            <span className='font-semibold'>Unit Type:</span>{" "}
            <span className='capitalize'>{inventoryItem.items.unit_type}</span>
          </p>
          <p>
            <span className='font-semibold'>UPC Number:</span>{" "}
            {inventoryItem.items.upc_number || "N/A"}
          </p>
          {inventoryItem.items.unit_type === "weight" && (
            <p>
              <span className='font-semibold'>Avg. Unit Weight:</span>{" "}
              {inventoryItem.items.average_weight_per_unit?.toFixed(2) || "N/A"}{" "}
              lbs
            </p>
          )}
          <p>
            <span className='font-semibold'>Master Item ID:</span>{" "}
            {inventoryItem.item_id}
          </p>
          <p>
            <span className='font-semibold'>Inventory Item ID:</span>{" "}
            {inventoryItem.id}
          </p>
        </div>

        <div className='mt-6 border-t pt-6'>
          <h2 className='text-2xl font-semibold mb-4'>Update Count</h2>
          <div className='flex flex-col sm:flex-row items-center gap-4'>
            <label htmlFor='countedUnits' className='font-medium text-lg'>
              Counted Units:
            </label>
            <input
              id='countedUnits'
              type='number'
              step={inventoryItem.items.unit_type === "quantity" ? "1" : "any"}
              value={editingCount ?? ""} // This part is correct: undefined becomes ""
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === "") {
                  setEditingCount(undefined); // <--- CHANGE THIS LINE: Allow the input to be truly empty
                } else {
                  // <--- CHANGE THIS LINE: Perform conversion only if not empty
                  setEditingCount(Number(inputValue));
                }
              }}
              className='flex-grow p-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            <button
              onClick={() =>
                editingCount !== undefined && handleUpdateCount(editingCount)
              }
              disabled={
                updateInventoryItemMutation.isPending ||
                editingCount === undefined
              }
              className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {updateInventoryItemMutation.isPending
                ? "Updating..."
                : "Save Count"}
            </button>
          </div>
          {inventoryItem.items.unit_type === "weight" &&
            inventoryItem.items.average_weight_per_unit != null &&
            editingCount !== undefined && (
              <p className='mt-2 text-gray-700'>
                Calculated Total Weight:{" "}
                {(
                  editingCount * inventoryItem.items.average_weight_per_unit
                ).toFixed(2)}{" "}
                lbs
              </p>
            )}
        </div>

        {/* Navigation Buttons */}
        <div className='mt-8 flex justify-between items-center border-t pt-6'>
          <button
            onClick={handlePrevious}
            disabled={isFirstItem || updateInventoryItemMutation.isPending}
            className='bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            &larr; Previous Item
          </button>
          <span className='text-lg font-medium text-gray-700'>
            {currentIndex !== undefined && totalItems > 0
              ? `${currentIndex + 1} / ${totalItems}`
              : ""}
          </span>
          <button
            onClick={handleNext}
            disabled={isLastItem || updateInventoryItemMutation.isPending}
            className='bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Next Item &rarr;
          </button>
        </div>
      </main>
    </div>
  );
}
