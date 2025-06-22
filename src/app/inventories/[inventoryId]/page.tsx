// src/app/inventories/[inventoryId]/page.tsx
"use client"; // This page is a client component

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react"; // Import useSession for NextAuth.js
import { Inventory, InventoryItem, Item } from "@/types"; // Adjust path if necessary
import { useItems } from "@/hooks/useItems"; // Assumed to use new API routes for master items
import {
  useInventoryItems,
  useAddInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
  useAddAllInventoryItems, // NEW: Import the new hook for adding all items
} from "../../../hooks/useInventoryItems"; // Adjust path if necessary
import { useUpdateInventory } from "../../../hooks/useInventories"; // Assumed to use new API routes
import { sortForItemTypeOnly } from "@/lib/utils"; // Your utility function

/**
 * LoadingSpinner Component
 * Displays a simple animated spinner.
 */
const LoadingSpinner: React.FC = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

/**
 * useInventoryDetails Custom Hook
 * Fetches details for a specific inventory using a Next.js API route.
 * Replaces direct Supabase call with a standard fetch.
 * Assumes the API route handles user authorization.
 */
const useInventoryDetails = (inventoryId: string | undefined) => {
  const { data: session, status } = useSession();

  return useQuery<Inventory>({
    queryKey: ["inventory", inventoryId],
    queryFn: async () => {
      if (!inventoryId) {
        throw new Error("Inventory ID is missing.");
      }
      if (status !== "authenticated") {
        throw new Error("Authentication required.");
      }

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

// Helper type for the combined InventoryItem and Item relation (matches API include)
type CombinedInventoryItem = InventoryItem & { item: Item };

/**
 * InventoryDetailPage Component
 * Displays details of a specific inventory, including its items,
 * and allows for managing (adding, deleting) those items.
 */
export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.inventoryId as string;

  const { data: session, status } = useSession();

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

  // --- Data Fetching and Mutations ---
  const {
    data: inventory,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
  } = useInventoryDetails(inventoryId);
  const {
    data: allUserItems,
    isLoading: isAllItemsLoading,
    isError: isAllItemsError,
    error: allItemsError,
  } = useItems(); // Fetches master items
  const {
    data: currentInventoryItems,
    isLoading: isCurrentItemsLoading,
    isError: isCurrentItemsError,
    error: currentItemsError,
  } = useInventoryItems(inventoryId); // Fetches InventoryItems for THIS inventory

  const addInventoryItemMutation = useAddInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();
  const updateInventoryMutation = useUpdateInventory();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const addAllInventoryItemsMutation = useAddAllInventoryItems(); // NEW: Initialize the new mutation hook

  // --- Component State ---
  const [sortColumn, setSortColumn] = useState<InventoryItemSortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");
  const [editingInventoryItem, setEditingInventoryItem] =
    useState<CombinedInventoryItem | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/sign-in");
    }
  }, [status, router]);

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

  const availableItemsToAdd = useMemo(() => {
    if (!allUserItems || !currentInventoryItems) {
      return [];
    }

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

  const handleSort = (column: InventoryItemSortColumn) => {
    setCurrentPage(1);
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

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

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleItemsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(event.target.value));
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
        "This item has already been added to this inventory. Please select another item.",
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
          errorMessage.includes("P2002") ||
          errorMessage.includes("already exists")
        ) {
          errorMessage =
            "This item has already been added to this inventory. Please select another item.";
        }
      }
      showMessage(`Error adding item to inventory: ${errorMessage}`, "error");
    }
  };

  // NEW: Handler for adding all remaining items
  const handleAddAllRemainingItemsToInventory = async () => {
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    if (availableItemsToAdd.length === 0) {
      showMessage("All available items are already in this inventory.", "info");
      return;
    }

    // Confirmation before adding all items
    const userConfirmed = window.confirm(
      `Are you sure you want to add all ${availableItemsToAdd.length} remaining items to this inventory?`
    );

    if (!userConfirmed) {
      return;
    }

    try {
      // The mutation will send the inventoryId, and the API will handle finding all available items
      await addAllInventoryItemsMutation.mutateAsync(inventoryId);
      showMessage("All remaining items added to inventory!", "success");
    } catch (err) {
      let errorMessage = "Unknown error adding all items.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
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

  // Handler for updating counted units of an InventoryItem
  const handleUpdateCountedUnits = async (
    invItemId: string,
    currentCount: number,
    itemUnitType: string
  ) => {
    const newCount = prompt(
      `Enter new count for item (current: ${currentCount} ${itemUnitType}):`
    );
    if (newCount === null) {
      // User cancelled prompt
      return;
    }

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
        inventory_id: inventoryId, // Pass inventory_id for invalidation
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

  const isAnyLoading =
    isInventoryLoading ||
    isAllItemsLoading ||
    isCurrentItemsLoading ||
    status === "loading" ||
    addAllInventoryItemsMutation.isPending; // Include the new mutation's loading state
  const isAnyError =
    isInventoryError ||
    isAllItemsError ||
    isCurrentItemsError ||
    status === "unauthenticated";

  if (isAnyLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <LoadingSpinner />
      </div>
    );
  }

  if (isAnyError) {
    const errorMessage =
      inventoryError?.message ||
      allItemsError?.message ||
      currentItemsError?.message ||
      (status === "unauthenticated"
        ? "You are not authenticated to view this page."
        : "An unknown error occurred.");

    if (
      status === "unauthenticated" ||
      errorMessage.includes("Authentication required.")
    ) {
      router.push("/auth/sign-in");
      return null;
    }

    const isNotFound = errorMessage?.includes("not found");

    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <div className='text-center p-6 bg-background-surface rounded-lg shadow-md'>
          <p className='text-error text-lg mb-4'>
            Error loading data: {errorMessage}
          </p>
          {isNotFound && (
            <p className='text-text-muted'>
              This inventory might not exist or you don&apos;t have permission
              to view it.
            </p>
          )}
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
      {/* Custom Message Box for alerts */}
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
              addAllInventoryItemsMutation.isPending // Disable if bulk add is pending
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
              addAllInventoryItemsMutation.isPending // Disable if bulk add is pending
            }
            className='bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addInventoryItemMutation.isPending ? "Adding..." : "Add Item"}
          </button>
          {/* NEW: Add All Remaining Items Button */}
          <button
            onClick={handleAddAllRemainingItemsToInventory}
            disabled={
              addAllInventoryItemsMutation.isPending ||
              availableItemsToAdd.length === 0 ||
              addInventoryItemMutation.isPending // Disable if single add is pending
            }
            className='bg-success hover:bg-success/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addAllInventoryItemsMutation.isPending
              ? "Adding All..."
              : "Add All Remaining Items"}
          </button>
        </div>

        <div className='overflow-x-auto'>
          {sortedInventoryItems && sortedInventoryItems.length === 0 ? (
            <p className='text-text-muted text-center py-8'>
              This inventory has no items yet. Add some from the dropdown above!
            </p>
          ) : (
            <>
              {/* Items per page dropdown */}
              <div className='flex items-center justify-end mb-4'>
                <label htmlFor='itemsPerPage' className='text-text-muted mr-2'>
                  Items per page:
                </label>
                <select
                  id='itemsPerPage'
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className='p-2 border border-border-base rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background-surface text-text-base'
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <table className='min-w-full bg-background-surface border border-border-base'>
                <thead>
                  <tr className='bg-background-base text-left text-xs font-semibold text-text-muted uppercase tracking-wider'>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("name")}
                    >
                      Item Name
                      {sortColumn === "name" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("brand")}
                    >
                      Brand
                      {sortColumn === "brand" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("item_type")}
                    >
                      Item Type
                      {sortColumn === "item_type" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("unit_type")}
                    >
                      Unit Type
                      {sortColumn === "unit_type" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("upc_number")}
                    >
                      UPC Number
                      {sortColumn === "upc_number" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("counted_units")}
                    >
                      Count (Units)
                      {sortColumn === "counted_units" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/50'
                      onClick={() => handleSort("calculated_weight")}
                    >
                      Total Weight (lbs)
                      {sortColumn === "calculated_weight" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th className='py-3 px-4 border-b border-border-base text-center'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((invItem) => (
                    <tr
                      key={invItem.id}
                      className='hover:bg-background-base/50'
                    >
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {(invItem as CombinedInventoryItem).item?.name || "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {(invItem as CombinedInventoryItem).item?.brand ||
                          "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base capitalize text-text-base'>
                        {(invItem as CombinedInventoryItem).item?.item_type ||
                          "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base capitalize text-text-base'>
                        {(invItem as CombinedInventoryItem).item?.unit_type ||
                          "N/A"}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {(invItem as CombinedInventoryItem).item?.upc_number ||
                          "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {invItem.counted_units} units
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {(invItem as CombinedInventoryItem).item?.unit_type ===
                        "weight"
                          ? `${
                              (
                                (invItem.counted_units || 0) *
                                ((invItem as CombinedInventoryItem).item
                                  ?.average_weight_per_unit || 0)
                              ).toFixed(2) || "0.00"
                            } lbs`
                          : "-"}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-center space-x-2 space-y-2'>
                        <button
                          onClick={() =>
                            router.push(
                              `/inventories/${inventoryId}/items/${invItem.id}`
                            )
                          }
                          className='bg-primary hover:bg-primary/90 text-text-inverse text-sm py-1 px-2 rounded'
                        >
                          View / Edit
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateCountedUnits(
                              invItem.id,
                              invItem.counted_units,
                              (invItem as CombinedInventoryItem).item
                                ?.unit_type || "units"
                            )
                          }
                          className='bg-accent hover:bg-accent/80 text-text-inverse text-sm py-1 px-2 rounded'
                        >
                          Update Count
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteInventoryItem(
                              invItem.id,
                              (invItem as CombinedInventoryItem).item?.name ||
                                "Unknown Item"
                            )
                          }
                          className='bg-error hover:bg-error/90 text-text-inverse text-sm py-1 px-2 rounded'
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* --- Streamlined Pagination Controls --- */}
              {totalPages > 1 && (
                <div className='mt-6 flex justify-between items-center px-4'>
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className='bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    &larr; Previous
                  </button>
                  <span className='md:text-lg font-medium text-foreground'>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className='bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
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
