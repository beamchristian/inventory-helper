// src/app/inventories/[inventoryId]/items/[itemId]/page.tsx
"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryItem, Item } from "@/types"; // Ensure correct path for your types
import {
  useInventoryItems,
  useUpdateInventoryItem,
} from "@/hooks/useInventoryItems";
import { sortForCountMode, sortForItemTypeOnly } from "@/lib/utils";

/**
 * FIXED: useInventoryItemDetails Hook
 */
const useInventoryItemDetails = (
  inventoryId: string,
  itemId: string | undefined
) => {
  // CORRECTED: Type now uses 'item' (singular)
  return useQuery<InventoryItem & { item: Item }>({
    queryKey: ["inventoryItem", itemId],
    queryFn: async () => {
      if (!itemId || !inventoryId) throw new Error("ID is missing.");

      // CORRECTED: Use the full, correct API route path
      const response = await fetch(
        `/api/inventories/${inventoryId}/items/${itemId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch inventory item details."
        );
      }

      // The API returns an object with a nested 'item' property
      return response.json();
    },
    enabled: !!itemId && !!inventoryId,
  });
};

/**
 * InventoryItemDetailPage Component
 */
export default function InventoryItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const inventoryId = params.inventoryId as string;
  const itemId = params.itemId as string;
  const sortMode = searchParams.get("sortMode") || "default";

  const queryClient = useQueryClient();

  const {
    data: inventoryItem,
    isLoading: isInventoryItemLoading,
    isError: isInventoryItemError,
    error: inventoryItemError,
  } = useInventoryItemDetails(inventoryId, itemId); // Pass both IDs

  const {
    data: rawInventoryItems,
    isLoading: areAllItemsLoading,
    isError: areAllItemsError,
    error: allItemsError,
  } = useInventoryItems(inventoryId);

  const allInventoryItems = useMemo(() => {
    if (!rawInventoryItems) return [];
    // The sort functions expect 'item' (singular), which is correct now.
    switch (sortMode) {
      case "itemType":
        return sortForItemTypeOnly(rawInventoryItems);
      case "default":
      default:
        return sortForCountMode(rawInventoryItems);
    }
  }, [rawInventoryItems, sortMode]);

  const updateInventoryItemMutation = useUpdateInventoryItem();
  const [inputValue, setInputValue] = useState<string>("");

  const performUpdate = useCallback(
    async (newCount: number) => {
      // ✅ SAFETY CHECK: Ensure data exists before using it
      if (!inventoryItem?.id || !inventoryItem.inventory_id) return;

      if (newCount < 0) {
        alert("Count cannot go below zero.");
        return;
      }

      // ✅ SAFETY CHECK: Access nested property safely
      if (
        inventoryItem.item?.unit_type === "quantity" &&
        !Number.isInteger(newCount)
      ) {
        alert("Quantity items must have whole number counts.");
        newCount = Math.floor(newCount);
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
        setInputValue("");
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

  // ... (the rest of the component handlers like handleOperation, navigateToItem, etc. can remain the same)

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
      // Pass the sortMode in the URL to maintain sort order during navigation
      router.push(
        `/inventories/${inventoryId}/items/${nextOrPrevItem.id}?sortMode=${sortMode}`
      );
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

  if (isInventoryItemLoading || areAllItemsLoading) {
    return (
      <div className='flex justify-center items-center h-screen bg-background-base'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (isInventoryItemError || areAllItemsError || !inventoryItem) {
    const errorMsg =
      inventoryItemError?.message ||
      allItemsError?.message ||
      "Inventory item not found.";
    return (
      <div className='text-error text-center mt-8 bg-background-base p-4 rounded-lg'>
        Error: {errorMsg}
      </div>
    );
  }

  // ✅ DESTRUCTURE SAFELY: Destructure the nested item with a fallback
  const { item } = inventoryItem;
  const currentCount = inventoryItem.counted_units ?? 0;
  const calculatedTotalWeight =
    item?.unit_type === "weight" && item?.average_weight_per_unit != null
      ? (currentCount * item.average_weight_per_unit).toFixed(2)
      : null;

  const isFirstItem = currentIndex === 0;
  const isLastItem = currentIndex === totalItems - 1;
  const isUpdating = updateInventoryItemMutation.isPending;

  return (
    <div className='container mx-auto p-4 max-w-2xl bg-background-base mt-4 rounded-lg'>
      <header className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-foreground'>
          {/* ✅ SAFETY: Use optional chaining and fallback */}
          Viewing Item: {item?.name ?? "Loading..."}
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
          {/* ✅ SAFETY: Use optional chaining throughout the JSX */}
          <p>
            <span className='font-semibold'>Item Name:</span>{" "}
            {item?.name ?? "N/A"}
          </p>
          <p>
            <span className='font-semibold'>Unit Type:</span>{" "}
            <span className='capitalize'>{item?.unit_type ?? "N/A"}</span>
          </p>
          <p>
            <span className='font-semibold'>UPC Number:</span>{" "}
            {item?.upc_number || "N/A"}
          </p>
          {item?.unit_type === "weight" && (
            <p>
              <span className='font-semibold'>Avg. Unit Weight:</span>{" "}
              {item?.average_weight_per_unit?.toFixed(2) || "N/A"} lbs
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

        <div className='mt-6 pt-6'>
          <h2 className='text-2xl font-semibold mb-4 text-foreground text-center'>
            Current Count
          </h2>
          <div className='text-4xl font-extrabold text-primary text-center mb-6'>
            {currentCount}
          </div>

          <div className='flex flex-col gap-4 items-center'>
            <input
              id='countInput'
              type='number'
              step={item?.unit_type === "quantity" ? "1" : "any"}
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
