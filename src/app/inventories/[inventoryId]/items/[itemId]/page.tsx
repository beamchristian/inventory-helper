// src/app/inventories/[inventoryId]/items/[itemId]/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InventoryItem, Item } from "@/types";
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

  const {
    data: allInventoryItems,
    isLoading: areAllItemsLoading,
    isError: areAllItemsError,
    error: allItemsError,
  } = useInventoryItems(inventoryId);

  const updateInventoryItemMutation = useUpdateInventoryItem();

  // State for the value entered into the input field
  const [inputValue, setInputValue] = useState<string>("");

  // Helper function to update the count
  const performUpdate = useCallback(
    async (newCount: number) => {
      if (!inventoryItem?.id || !inventoryItem.inventory_id) return;

      if (newCount < 0) {
        alert("Count cannot go below zero.");
        return;
      }

      if (
        inventoryItem.items.unit_type === "quantity" &&
        !Number.isInteger(newCount)
      ) {
        alert("Quantity items must have whole number counts.");
        newCount = Math.floor(newCount); // Force it to be an integer
      }

      try {
        await updateInventoryItemMutation.mutateAsync({
          id: inventoryItem.id,
          counted_units: newCount,
          inventory_id: inventoryItem.inventory_id,
        });
        queryClient.invalidateQueries({ queryKey: ["inventoryItem", itemId] });
        queryClient.invalidateQueries({
          queryKey: ["inventoryItems", inventoryId],
        });
        setInputValue(""); // Clear input after successful update
      } catch (err) {
        alert(
          `Error updating count: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    },
    [
      inventoryItem,
      updateInventoryItemMutation,
      queryClient,
      itemId,
      inventoryId,
    ]
  );

  const handleOperation = (operation: "add" | "subtract" | "replace") => {
    const value = parseFloat(inputValue);

    if (isNaN(value)) {
      alert("Please enter a valid number.");
      return;
    }

    let newCount: number;
    const currentCount = inventoryItem?.counted_units ?? 0;

    switch (operation) {
      case "add":
        newCount = currentCount + value;
        break;
      case "subtract":
        newCount = currentCount - value;
        break;
      case "replace":
        newCount = value;
        break;
      default:
        return;
    }

    performUpdate(newCount);
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
  const isUpdating = updateInventoryItemMutation.isPending;

  if (isInventoryItemLoading || areAllItemsLoading) {
    return (
      <div className='flex justify-center items-center h-screen bg-background-base'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (isInventoryItemError) {
    return (
      <div className='text-error text-center mt-8 bg-background-base p-4 rounded-lg'>
        Error loading item: {inventoryItemError?.message}
      </div>
    );
  }

  if (areAllItemsError) {
    return (
      <div className='text-error text-center mt-8 bg-background-base p-4 rounded-lg'>
        Error loading inventory items list: {allItemsError?.message}
      </div>
    );
  }

  if (!inventoryItem) {
    return (
      <div className='text-center mt-8 text-text-muted bg-background-base p-4 rounded-lg'>
        Inventory item not found.
      </div>
    );
  }

  const currentCount = inventoryItem.counted_units ?? 0;
  const calculatedTotalWeight =
    inventoryItem.items.unit_type === "weight" &&
    inventoryItem.items.average_weight_per_unit != null
      ? (currentCount * inventoryItem.items.average_weight_per_unit).toFixed(2)
      : null;

  return (
    <div className='container mx-auto p-4 max-w-2xl bg-background-base mt-4 rounded-lg'>
      <header className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-foreground'>
          Viewing Item: {inventoryItem.items.name}
        </h1>
        <button
          onClick={() => router.push(`/inventories/${inventoryId}`)}
          className='bg-secondary hover:bg-secondary/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md'
        >
          Back to Inventory
        </button>
      </header>

      <main className='bg-background-surface p-6 rounded-lg shadow-md border border-border-base'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-lg mb-6'>
          <p className='text-text-base'>
            <span className='font-semibold'>Item Name:</span>{" "}
            {inventoryItem.items.name}
          </p>
          <p className='text-text-base'>
            <span className='font-semibold'>Unit Type:</span>{" "}
            <span className='capitalize'>{inventoryItem.items.unit_type}</span>
          </p>
          <p className='text-text-base'>
            <span className='font-semibold'>UPC Number:</span>{" "}
            {inventoryItem.items.upc_number || "N/A"}
          </p>
          {inventoryItem.items.unit_type === "weight" && (
            <p className='text-text-base'>
              <span className='font-semibold'>Avg. Unit Weight:</span>{" "}
              {inventoryItem.items.average_weight_per_unit?.toFixed(2) || "N/A"}{" "}
              lbs
            </p>
          )}
          <p className='text-text-base'>
            <span className='font-semibold'>Master Item ID:</span>{" "}
            {inventoryItem.item_id}
          </p>
          <p className='text-text-base'>
            <span className='font-semibold'>Inventory Item ID:</span>{" "}
            {inventoryItem.id}
          </p>
        </div>

        <div className='mt-6 pt-6'>
          <h2 className='text-2xl font-semibold mb-4 text-foreground text-center'>
            Current Count
          </h2>
          <div className='text-4xl font-extrabold text-primary text-center mb-6'>
            {currentCount}
          </div>

          <div className='flex flex-col gap-4 items-center'>
            <label htmlFor='countInput' className='sr-only'>
              Enter value to add, subtract, or replace
            </label>
            <input
              id='countInput'
              type='number'
              step={inventoryItem.items.unit_type === "quantity" ? "1" : "any"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder='Enter value'
              className='p-3 border border-border-base rounded-lg shadow-sm text-center text-foreground bg-background w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary'
            />

            <div className='flex flex-wrap justify-center gap-3 w-full max-w-xs'>
              <button
                onClick={() => handleOperation("add")}
                disabled={isUpdating || inputValue === ""}
                className='flex-1 min-w-[80px] bg-success hover:bg-success/80 text-text-inverse font-bold py-3 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
              >
                Add
              </button>
              <button
                onClick={() => handleOperation("subtract")}
                disabled={isUpdating || inputValue === ""}
                className='flex-1 min-w-[80px] bg-error hover:bg-error/80 text-text-inverse font-bold py-3 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
              >
                Subtract
              </button>
              <button
                onClick={() => handleOperation("replace")}
                disabled={isUpdating || inputValue === ""}
                className='flex-1 min-w-[80px] bg-primary hover:bg-primary/80 text-text-inverse font-bold py-3 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
              >
                Replace
              </button>
            </div>
          </div>

          {calculatedTotalWeight !== null && (
            <p className='mt-6 text-text-muted text-center text-lg'>
              Calculated Total Weight:{" "}
              <span className='font-semibold'>{calculatedTotalWeight}</span> lbs
            </p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className='mt-8 flex justify-between items-center pt-6'>
          <button
            onClick={handlePrevious}
            disabled={isFirstItem || isUpdating}
            className='bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-2 md:px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            &larr; Previous Item
          </button>
          <span className='md:text-lg font-medium text-foreground'>
            {currentIndex !== undefined && totalItems > 0
              ? `${currentIndex + 1} / ${totalItems}`
              : ""}
          </span>
          <button
            onClick={handleNext}
            disabled={isLastItem || isUpdating}
            className='bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Next Item &rarr;
          </button>
        </div>
      </main>
    </div>
  );
}
