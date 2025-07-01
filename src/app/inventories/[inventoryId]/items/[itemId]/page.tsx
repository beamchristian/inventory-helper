"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryItem, Item } from "@/types";
import {
  useInventoryItems,
  useUpdateInventoryItem,
} from "@/hooks/useInventoryItems";
import { PaginationControls } from "@/components/PaginationControls";

type InventoryItemSortColumn =
  | "name"
  | "unit_type"
  | "upc_number"
  | "counted_units"
  | "calculated_weight"
  | "brand"
  | "item_type";

/**
 * useInventoryItemDetails Hook
 */
const useInventoryItemDetails = (
  inventoryId: string,
  itemId: string | undefined
) => {
  return useQuery<InventoryItem & { item: Item }>({
    queryKey: ["inventoryItem", itemId],
    queryFn: async () => {
      if (!itemId || !inventoryId) throw new Error("ID is missing.");
      const response = await fetch(
        `/api/inventories/${inventoryId}/items/${itemId}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch inventory item details."
        );
      }
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
  const queryClient = useQueryClient();

  const inventoryId = params.inventoryId as string;
  const itemId = params.itemId as string;

  // NEW: Read sort parameters from the URL, providing defaults to match the main page
  const sortColumn =
    (searchParams.get("sortColumn") as InventoryItemSortColumn) || "item_type";
  const sortDirection =
    (searchParams.get("sortDirection") as "asc" | "desc") || "asc";

  const [inputValue, setInputValue] = useState<string>("");

  const {
    data: inventoryItem,
    isLoading: isInventoryItemLoading,
    isError: isInventoryItemError,
    error: inventoryItemError,
  } = useInventoryItemDetails(inventoryId, itemId);
  const {
    data: rawInventoryItems,
    isLoading: areAllItemsLoading,
    isError: areAllItemsError,
    error: allItemsError,
  } = useInventoryItems(inventoryId);
  const updateInventoryItemMutation = useUpdateInventoryItem();

  // MODIFIED: This now uses the exact same sorting logic as the main page
  const navigableItems = useMemo(() => {
    if (!rawInventoryItems) return [];

    const unentered = rawInventoryItems.filter((item) => !item.is_entered);
    const sortableItems = [...unentered];

    sortableItems.sort((a, b) => {
      let aValue: string | number | null | undefined;
      let bValue: string | number | null | undefined;
      switch (sortColumn) {
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

      let comparison = 0;
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      if (comparison === 0) {
        comparison = a.item.name.localeCompare(b.item.name);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sortableItems;
  }, [rawInventoryItems, sortColumn, sortDirection]);

  const currentIndex = useMemo(
    () => navigableItems.findIndex((item) => item.id === itemId),
    [navigableItems, itemId]
  );
  const totalItems = navigableItems.length || 0;

  // MODIFIED: Navigation now preserves the sort parameters
  const navigateToItem = useCallback(
    (index: number) => {
      if (navigableItems && index >= 0 && index < totalItems) {
        const nextOrPrevItem = navigableItems[index];
        router.push(
          `/inventories/${inventoryId}/items/${nextOrPrevItem.id}?sortColumn=${sortColumn}&sortDirection=${sortDirection}`
        );
      }
    },
    [navigableItems, inventoryId, router, sortColumn, sortDirection, totalItems]
  );

  const performUpdate = useCallback(
    async (newCount: number) => {
      if (!inventoryItem?.id || !inventoryItem.inventory_id) return;
      if (newCount < 0) {
        alert("Count cannot go below zero.");
        return;
      }
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

  const handleOperation = (operation: "add" | "subtract" | "replace") => {
    const value = parseFloat(inputValue);
    if (isNaN(value)) {
      alert("Please enter a valid number.");
      return;
    }
    const currentCount = inventoryItem?.counted_units ?? 0;
    let newCount: number;
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

  const { item } = inventoryItem;
  const currentCount = inventoryItem.counted_units ?? 0;
  const calculatedTotalWeight =
    item?.unit_type === "weight" && item?.average_weight_per_unit != null
      ? (currentCount * item.average_weight_per_unit).toFixed(2)
      : null;
  const isUpdating = updateInventoryItemMutation.isPending;

  return (
    <div className='container mx-auto p-4 max-w-2xl bg-background-base mt-4 rounded-lg'>
      <header className='flex flex-col sm:flex-row justify-between items-center mb-6 gap-4'>
        <h1 className='text-2xl sm:text-3xl font-bold text-foreground text-center sm:text-left'>
          Viewing Item: {item?.name ?? "Loading..."}
        </h1>
        <button
          onClick={() => router.push(`/inventories/${inventoryId}`)}
          className='bg-secondary hover:bg-secondary/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md w-full sm:w-auto'
        >
          Back to Inventory
        </button>
      </header>
      <main className='bg-background-surface p-4 sm:p-6 rounded-lg shadow-md border border-border-base'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-lg mb-6'>
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
        <PaginationControls
          currentPage={currentIndex + 1}
          totalPages={totalItems}
          onPageChange={(page) => navigateToItem(page - 1)}
          itemsPerPage={1}
          onItemsPerPageChange={() => {}}
          prevButtonContent={<>&larr; Previous Item</>}
          nextButtonContent={<>Next Item &rarr;</>}
          noun='Item'
          showItemsPerPage={false}
        />
      </main>
    </div>
  );
}
