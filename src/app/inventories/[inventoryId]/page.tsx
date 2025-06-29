// src/app/inventories/[inventoryId]/page.tsx
"use client"; // This page is a client component

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Inventory, InventoryItem, Item } from "@/types";
import { useAllItems } from "@/hooks/useItems";
import {
  useInventoryItems,
  useAddInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
  useAddAllInventoryItems,
} from "../../../hooks/useInventoryItems";
import { useUpdateInventory } from "../../../hooks/useInventories";
import { sortForItemTypeOnly } from "@/lib/utils";
import { PaginationControls } from "@/components/PaginationControls";

/**
 * LoadingSpinner Component
 */
const LoadingSpinner: React.FC = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

/**
 * useInventoryDetails Custom Hook
 */
const useInventoryDetails = (inventoryId: string | undefined) => {
  const { status } = useSession();
  return useQuery<Inventory>({
    queryKey: ["inventory", inventoryId],
    queryFn: async () => {
      if (!inventoryId) throw new Error("Inventory ID is missing.");
      if (status !== "authenticated")
        throw new Error("Authentication required.");
      const response = await fetch(`/api/inventories/${inventoryId}`);
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message || `Failed to fetch inventory: ${response.status}`
        );
      }
      return response.json();
    },
    enabled: !!inventoryId && status === "authenticated",
  });
};

type InventoryItemSortColumn =
  | "name"
  | "unit_type"
  | "upc_number"
  | "counted_units"
  | "calculated_weight"
  | "brand"
  | "item_type";

type CombinedInventoryItem = InventoryItem & { item: Item };

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.inventoryId as string;
  const { status } = useSession();

  const [sortColumn, setSortColumn] = useState<InventoryItemSortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");

  const {
    data: inventory,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
  } = useInventoryDetails(inventoryId);
  const {
    data: allUserItems, // This is now correctly typed as Item[]
    isLoading: isAllItemsLoading,
    isError: isAllItemsError,
    error: allItemsError,
  } = useAllItems();

  const {
    data: currentInventoryItems,
    isLoading: isCurrentItemsLoading,
    isError: isCurrentItemsError,
    error: currentItemsError,
  } = useInventoryItems(inventoryId);

  const addInventoryItemMutation = useAddInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();
  const updateInventoryMutation = useUpdateInventory();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const addAllInventoryItemsMutation = useAddAllInventoryItems();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  const sortedInventoryItems = useMemo(() => {
    if (!currentInventoryItems) return [];
    const sortableItems = [...currentInventoryItems];
    sortableItems.sort((a, b) => {
      let aValue: string | number | null | undefined;
      let bValue: string | number | null | undefined;
      switch (sortColumn) {
        case "name":
          aValue = (a as CombinedInventoryItem).item.name;
          bValue = (b as CombinedInventoryItem).item.name;
          break;
        case "unit_type":
          aValue = (a as CombinedInventoryItem).item.unit_type;
          bValue = (b as CombinedInventoryItem).item.unit_type;
          break;
        case "upc_number":
          aValue = (a as CombinedInventoryItem).item.upc_number;
          bValue = (b as CombinedInventoryItem).item.upc_number;
          break;
        case "counted_units":
          aValue = a.counted_units;
          bValue = b.counted_units;
          break;
        case "calculated_weight":
          aValue =
            (a.counted_units || 0) *
            ((a as CombinedInventoryItem).item.average_weight_per_unit || 0);
          bValue =
            (b.counted_units || 0) *
            ((b as CombinedInventoryItem).item.average_weight_per_unit || 0);
          break;
        case "brand":
          aValue = (a as CombinedInventoryItem).item.brand;
          bValue = (b as CombinedInventoryItem).item.brand;
          break;
        case "item_type":
          aValue = (a as CombinedInventoryItem).item.item_type;
          bValue = (b as CombinedInventoryItem).item.item_type;
          break;
        default:
          aValue = (a as CombinedInventoryItem).item.name;
          bValue = (b as CombinedInventoryItem).item.name;
      }
      if (aValue === null || aValue === undefined)
        return sortDirection === "asc" ? 1 : -1;
      if (bValue === null || bValue === undefined)
        return sortDirection === "asc" ? -1 : 1;
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const valA = String(aValue);
      const valB = String(bValue);
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
    return sortableItems;
  }, [currentInventoryItems, sortColumn, sortDirection]);

  const totalItems = sortedInventoryItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedInventoryItems.slice(startIndex, endIndex);
  }, [sortedInventoryItems, currentPage, itemsPerPage]);

  const availableItemsToAdd = useMemo(() => {
    if (!allUserItems || !currentInventoryItems) return [];
    const currentItemIds = new Set(
      currentInventoryItems.map((invItem) => invItem.item_id)
    );
    return allUserItems.filter((userItem) => !currentItemIds.has(userItem.id));
  }, [allUserItems, currentInventoryItems]);

  useEffect(() => {
    if (availableItemsToAdd.length > 0) {
      if (
        !selectedItemIdToAdd ||
        !availableItemsToAdd.some((item) => item.id === selectedItemIdToAdd)
      ) {
        setSelectedItemIdToAdd(availableItemsToAdd[0].id);
      }
    } else {
      setSelectedItemIdToAdd("");
    }
  }, [availableItemsToAdd, selectedItemIdToAdd]);

  const showMessage = (
    message: string,
    type: "info" | "error" | "success" = "info"
  ) => {
    const messageBox = document.getElementById("messageBox");
    if (messageBox) {
      messageBox.innerText = message;
      messageBox.className = `fixed top-4 right-4 p-3 rounded-lg shadow-lg z-50 block `;
      if (type === "error")
        messageBox.classList.add("bg-red-500", "text-white");
      else if (type === "success")
        messageBox.classList.add("bg-green-500", "text-white");
      else messageBox.classList.add("bg-blue-500", "text-white");
      messageBox.style.display = "block";
      setTimeout(() => {
        if (messageBox) messageBox.style.display = "none";
      }, 5000);
    }
  };

  const handleStartItemTypeCountMode = () => {
    if (!currentInventoryItems || currentInventoryItems.length === 0) {
      showMessage("There are no items in this inventory to count.", "info");
      return;
    }
    const sortedForCount = sortForItemTypeOnly(currentInventoryItems);
    const firstItemId = sortedForCount[0].id;
    router.push(
      `/inventories/${inventoryId}/items/${firstItemId}?sortMode=itemType`
    );
  };

  const handleSort = (column: InventoryItemSortColumn) => {
    setCurrentPage(1);
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleAddItemToInventory = async () => {
    if (!selectedItemIdToAdd) {
      showMessage("Please select an item to add.", "info");
      return;
    }
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    const isAlreadyAdded = (currentInventoryItems || []).some(
      (invItem) => invItem.item_id === selectedItemIdToAdd
    );
    if (isAlreadyAdded) {
      showMessage(
        "This item has already been added. Please select another item.",
        "info"
      );
      return;
    }
    try {
      await addInventoryItemMutation.mutateAsync({
        inventory_id: inventoryId,
        item_id: selectedItemIdToAdd,
        counted_units: 0,
      });
      showMessage("Item added to inventory!", "success");
    } catch (err) {
      let errorMessage = "Unknown error adding item.";
      if (err instanceof Error) {
        errorMessage = err.message;
        if (
          errorMessage.includes("Unique constraint failed") ||
          errorMessage.includes("P2002")
        ) {
          errorMessage =
            "This item has already been added. Please select another item.";
        }
      }
      showMessage(`Error adding item: ${errorMessage}`, "error");
    }
  };

  const handleAddAllRemainingItemsToInventory = async () => {
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    if (availableItemsToAdd.length === 0) {
      showMessage("All available items are already in this inventory.", "info");
      return;
    }
    const userConfirmed = window.confirm(
      `Are you sure you want to add all ${availableItemsToAdd.length} remaining items to this inventory?`
    );
    if (!userConfirmed) return;
    try {
      await addAllInventoryItemsMutation.mutateAsync(inventoryId);
      showMessage("All remaining items added to inventory!", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error adding all items.";
      showMessage(`Error adding all items: ${errorMessage}`, "error");
    }
  };

  const handleDeleteInventoryItem = async (
    invItemId: string,
    itemName: string
  ) => {
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    const userConfirmed = window.confirm(
      `Are you sure you want to remove "${itemName}" from this inventory?`
    );
    if (userConfirmed) {
      try {
        await deleteInventoryItemMutation.mutateAsync({
          inventoryItemId: invItemId,
          inventoryId: inventoryId,
        });
        showMessage(`"${itemName}" removed from inventory.`, "success");
        if (paginatedItems.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (err) {
        showMessage(
          `Error removing item: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
          "error"
        );
      }
    }
  };

  const handleUpdateCountedUnits = async (
    invItemId: string,
    currentCount: number,
    itemUnitType: string
  ) => {
    const newCount = prompt(
      `Enter new count for item (current: ${currentCount} ${itemUnitType}):`
    );
    if (newCount === null) return;
    const parsedCount = parseFloat(newCount);
    if (isNaN(parsedCount) || parsedCount < 0) {
      showMessage(
        "Invalid count. Please enter a non-negative number.",
        "error"
      );
      return;
    }
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    try {
      await updateInventoryItemMutation.mutateAsync({
        id: invItemId,
        counted_units: parsedCount,
        inventory_id: inventoryId,
      });
      showMessage("Item count updated successfully!", "success");
    } catch (err) {
      showMessage(
        `Error updating item count: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleCompleteInventory = async () => {
    if (!inventory?.id) {
      showMessage("Inventory ID is not available to complete.", "error");
      return;
    }
    if (inventory.status === "completed") {
      showMessage("This inventory is already completed.", "info");
      return;
    }
    const userConfirmed = window.confirm(
      "Are you sure you want to complete this inventory? This action cannot be undone."
    );
    if (userConfirmed) {
      try {
        await updateInventoryMutation.mutateAsync({
          id: inventory.id,
          status: "completed",
        });
        showMessage(
          `Inventory "${inventory.name}" has been marked as completed.`,
          "success"
        );
      } catch (err) {
        showMessage(
          `Error completing inventory: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
          "error"
        );
      }
    }
  };

  if (isInventoryLoading || isAllItemsLoading || isCurrentItemsLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <LoadingSpinner />
      </div>
    );
  }
  if (isInventoryError || isAllItemsError || isCurrentItemsError) {
    const errorMessage =
      inventoryError?.message ||
      allItemsError?.message ||
      currentItemsError?.message;
    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <div className='text-center p-6 bg-background-surface rounded-lg shadow-md'>
          <p className='text-error text-lg mb-4'>Error: {errorMessage}</p>
          <button
            onClick={() => router.push("/")}
            className='mt-4 bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded'
          >
            Go back to Inventories
          </button>
        </div>
      </div>
    );
  }
  if (!inventory) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <div className='text-center p-6 bg-background-surface rounded-lg shadow-md'>
          <p className='text-text-muted text-lg mb-4'>Inventory not found.</p>
          <button
            onClick={() => router.push("/")}
            className='mt-4 bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded'
          >
            Go back to Inventories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4 max-w-5xl min-h-screen bg-background-base'>
      <div
        id='messageBox'
        className='fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-lg shadow-lg z-50 hidden'
      ></div>
      <header className='flex flex-col sm:flex-row justify-between items-center mb-8 gap-4'>
        <h1 className='text-3xl font-bold text-text-base text-center sm:text-left'>
          Inventory: {inventory.name}
        </h1>
        <div className='flex flex-col sm:flex-row gap-2'>
          <button
            onClick={handleStartItemTypeCountMode}
            disabled={
              !currentInventoryItems || currentInventoryItems.length === 0
            }
            className='bg-accent hover:bg-accent/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Count by Type
          </button>
          <button
            onClick={() => router.push("/")}
            className='bg-secondary hover:bg-secondary/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md w-full sm:w-auto'
          >
            Back to All Inventories
          </button>
        </div>
      </header>
      <main className='bg-background-surface p-4 sm:p-6 rounded-lg shadow-md'>
        <p className='text-lg text-text-base mb-2'>
          Status:{" "}
          <span className='capitalize font-medium'>{inventory.status}</span>
        </p>
        <p className='text-sm text-text-muted'>
          Created: {new Date(inventory.created_at).toLocaleDateString()} at{" "}
          {new Date(inventory.created_at).toLocaleTimeString()}
        </p>
        <h2 className='text-2xl font-semibold mt-8 mb-4 text-text-base'>
          Manage Items in This Inventory
        </h2>
        <div className='border border-border-base p-4 rounded bg-background-base mb-6 flex flex-wrap items-center gap-4'>
          <label
            htmlFor='selectItem'
            className='text-lg font-medium text-text-base'
          >
            Add an existing item:
          </label>
          <select
            id='selectItem'
            value={selectedItemIdToAdd}
            onChange={(e) => setSelectedItemIdToAdd(e.target.value)}
            className='flex-grow min-w-[150px] p-2 border border-border-base rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background-surface text-text-base'
            disabled={
              addInventoryItemMutation.isPending ||
              availableItemsToAdd.length === 0 ||
              addAllInventoryItemsMutation.isPending
            }
          >
            {availableItemsToAdd.length === 0 ? (
              <option value=''>No more items to add</option>
            ) : (
              availableItemsToAdd.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit_type})
                </option>
              ))
            )}
          </select>
          <button
            onClick={handleAddItemToInventory}
            disabled={
              addInventoryItemMutation.isPending ||
              availableItemsToAdd.length === 0 ||
              !selectedItemIdToAdd ||
              addAllInventoryItemsMutation.isPending
            }
            className='bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addInventoryItemMutation.isPending ? "Adding..." : "Add Item"}
          </button>
          <button
            onClick={handleAddAllRemainingItemsToInventory}
            disabled={
              addAllInventoryItemsMutation.isPending ||
              availableItemsToAdd.length === 0 ||
              addInventoryItemMutation.isPending
            }
            className='bg-success hover:bg-success/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addAllInventoryItemsMutation.isPending
              ? "Adding All..."
              : "Add All Remaining Items"}
          </button>
        </div>

        {/* NEW RESPONSIVE LIST/TABLE */}
        <div>
          {sortedInventoryItems.length === 0 ? (
            <p className='text-text-muted text-center py-8'>
              This inventory has no items yet.
            </p>
          ) : (
            <>
              {/* Header for Desktop View */}
              <div className='hidden md:grid md:grid-cols-12 gap-4 bg-background-base text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-base pt-5 pb-2 px-4'>
                <div
                  className='col-span-3 cursor-pointer'
                  onClick={() => handleSort("name")}
                >
                  Name{" "}
                  {sortColumn === "name" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </div>
                <div
                  className='col-span-2 cursor-pointer'
                  onClick={() => handleSort("brand")}
                >
                  Brand{" "}
                  {sortColumn === "brand" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </div>
                <div
                  className='col-span-2 cursor-pointer'
                  onClick={() => handleSort("item_type")}
                >
                  Type{" "}
                  {sortColumn === "item_type" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </div>
                <div
                  className='col-span-2 cursor-pointer'
                  onClick={() => handleSort("counted_units")}
                >
                  Count{" "}
                  {sortColumn === "counted_units" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </div>
                <div className='col-span-3 text-center'>Actions</div>
              </div>

              {/* List of Items (Cards on mobile, Rows on desktop) */}
              <div className='space-y-4 md:space-y-0'>
                {paginatedItems.map((invItem: CombinedInventoryItem) => (
                  <div
                    key={invItem.id}
                    className='p-4 border rounded-lg bg-background-surface md:grid md:grid-cols-12 md:gap-4 md:items-center md:p-0 md:py-3 md:border-0 md:border-b md:rounded-none'
                  >
                    {/* Column 1: Name */}
                    <div className='flex justify-between items-center md:col-span-3 md:px-4'>
                      <span className='font-bold text-sm text-text-muted md:hidden'>
                        Name
                      </span>
                      <span className='text-right md:text-left'>
                        {invItem.item?.name || "N/A"}
                      </span>
                    </div>

                    {/* Column 2: Brand */}
                    <div className='flex justify-between items-center border-t pt-2 mt-2 md:border-0 md:pt-0 md:mt-0 md:col-span-2 md:px-4'>
                      <span className='font-bold text-sm text-text-muted md:hidden'>
                        Brand
                      </span>
                      <span className='text-right md:text-left'>
                        {invItem.item?.brand || "N/A"}
                      </span>
                    </div>

                    {/* Column 3: Item Type */}
                    <div className='flex justify-between items-center border-t pt-2 mt-2 md:border-0 md:pt-0 md:mt-0 md:col-span-2 md:px-4'>
                      <span className='font-bold text-sm text-text-muted md:hidden'>
                        Type
                      </span>
                      <span className='text-right md:text-left capitalize'>
                        {invItem.item?.item_type || "N/A"}
                      </span>
                    </div>

                    {/* Column 4: Count */}
                    <div className='flex justify-between items-center border-t pt-2 mt-2 md:border-0 md:pt-0 md:mt-0 md:col-span-2 md:px-4'>
                      <span className='font-bold text-sm text-text-muted md:hidden'>
                        Count
                      </span>
                      <span className='text-right md:text-left'>
                        {invItem.counted_units} units
                      </span>
                    </div>

                    {/* Column 5: Actions */}
                    <div className='border-t pt-4 mt-4 md:border-0 md:pt-0 md:mt-0 md:col-span-3 md:px-4'>
                      <div className='flex flex-col sm:flex-row items-center justify-center gap-2'>
                        <button
                          onClick={() =>
                            router.push(
                              `/inventories/${inventoryId}/items/${invItem.id}`
                            )
                          }
                          className='bg-primary hover:bg-primary/90 text-text-inverse text-sm py-1 px-2 rounded w-full sm:w-auto'
                        >
                          View/Edit
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateCountedUnits(
                              invItem.id,
                              invItem.counted_units,
                              invItem.item?.unit_type || "units"
                            )
                          }
                          className='bg-accent hover:bg-accent/80 text-text-inverse text-sm py-1 px-2 rounded w-full sm:w-auto'
                        >
                          Update
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteInventoryItem(
                              invItem.id,
                              invItem.item?.name || "Unknown Item"
                            )
                          }
                          className='bg-error hover:bg-error/90 text-text-inverse text-sm py-1 px-2 rounded w-full sm:w-auto'
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage} // <-- FIXED: Pass state
                onItemsPerPageChange={handleItemsPerPageChange} // <-- FIXED: Pass handler
              />
            </>
          )}
        </div>

        {inventory.status !== "completed" && (
          <div className='mt-8 text-right'>
            <button
              onClick={handleCompleteInventory}
              disabled={updateInventoryMutation.isPending}
              className='bg-success hover:bg-success/90 text-text-inverse font-bold py-2 px-6 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {updateInventoryMutation.isPending
                ? "Completing..."
                : "Complete Inventory"}
            </button>
          </div>
        )}
        {inventory.status === "completed" && (
          <div className='mt-8 text-right text-lg text-success font-semibold'>
            This inventory is completed.
          </div>
        )}
      </main>
    </div>
  );
}
