// src/app/inventories/[inventoryId]/page.tsx
"use client";

// Importing React and hooks for component creation and state management.
import React, { useEffect, useState, useMemo } from "react";
// Importing Next.js navigation hooks for routing within the application.
import { useRouter, useParams } from "next/navigation";
// Importing Supabase client for database interactions.
import { supabase } from "../../../lib/supabase";
// Importing useQuery from TanStack Query for data fetching and caching.
import { useQuery } from "@tanstack/react-query";
// Importing custom types for data structures.
import { Inventory, InventoryItem, Item } from "../../../types";
// Importing custom hooks for managing master item list and inventory-specific items.
import { useItems } from "../../../hooks/useItems";
import {
  useInventoryItems,
  useAddInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from "../../../hooks/useInventoryItems";
// Import the new useUpdateInventory hook
import { useUpdateInventory } from "../../../hooks/useInventories";

/**
 * useInventoryDetails Hook
 * Fetches details for a specific inventory.
 * Requires inventoryId from URL parameters and authenticated userId for RLS.
 * @param {string | undefined} inventoryId - The ID of the inventory to fetch.
 * @returns {object} TanStack Query result object containing data, loading, and error states.
 */
const useInventoryDetails = (inventoryId: string | undefined) => {
  const [userId, setUserId] = useState<string | null>(null);

  // Fetches the current authenticated user's ID on component mount.
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  return useQuery<Inventory>({
    queryKey: ["inventory", inventoryId],
    queryFn: async () => {
      if (!inventoryId || !userId) {
        throw new Error("Inventory ID or User ID is missing.");
      }
      const { data, error } = await supabase
        .from("inventories")
        .select("*")
        .eq("id", inventoryId)
        .eq("user_id", userId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!inventoryId && !!userId,
  });
};

/**
 * LoadingSpinner Component
 * Displays a simple spinning loader during data fetching.
 * @returns {JSX.Element} A div containing a CSS-animated spinner.
 */
const LoadingSpinner = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500'></div>
  </div>
);

// Define the type for sortable columns for InventoryItem
type InventoryItemSortColumn =
  | "name" // refers to invItem.items.name
  | "unit_type" // refers to invItem.items.unit_type
  | "upc_number" // refers to invItem.items.upc_number
  | "counted_units"
  | "calculated_weight"
  | "brand" // New sortable column
  | "item_type"; // New sortable column

/**
 * InventoryDetailPage Component
 * Renders the detailed view for a single inventory, including its items,
 * and provides functionalities to add, update, and delete items.
 * @returns {JSX.Element} The inventory detail page layout.
 */
export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.inventoryId as string;

  // --- ALL HOOKS MUST BE CALLED AT THE TOP LEVEL, UNCONDITIONALLY ---
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
  } = useItems();
  const {
    data: currentInventoryItems,
    isLoading: isCurrentItemsLoading,
    isError: isCurrentItemsError,
    error: currentItemsError,
  } = useInventoryItems(inventoryId);

  const addInventoryItemMutation = useAddInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();
  const updateInventoryMutation = useUpdateInventory();

  // State for sorting
  const [sortColumn, setSortColumn] = useState<InventoryItemSortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // State for the selected item to add
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");

  // Calculate availableItemsToAdd. Use useMemo to prevent unnecessary recalculations.
  const availableItemsToAdd = useMemo(() => {
    // Ensure both `allUserItems` and `currentInventoryItems` are loaded before filtering
    if (!allUserItems || !currentInventoryItems) {
      return [];
    }

    const currentItemIds = new Set(
      currentInventoryItems.map((invItem) => invItem.item_id)
    );

    return allUserItems.filter((userItem) => !currentItemIds.has(userItem.id));
  }, [allUserItems, currentInventoryItems]); // Recalculate only when these change

  useEffect(() => {
    if (availableItemsToAdd.length > 0) {
      // If there are available items and the currently selected one is no longer
      // in the list (e.g., if it was just added, or if it was the problematic one),
      // or if nothing is selected, then default to the first available item.
      if (
        !selectedItemIdToAdd ||
        !availableItemsToAdd.some((item) => item.id === selectedItemIdToAdd)
      ) {
        setSelectedItemIdToAdd(availableItemsToAdd[0].id);
      }
    } else {
      // If no items are available, clear the selection.
      setSelectedItemIdToAdd("");
    }
  }, [availableItemsToAdd, selectedItemIdToAdd]); // Keep selectedItemIdToAdd here to react to its changes

  // Sorting logic
  const handleSort = (column: InventoryItemSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Memoize sorted inventory items
  const sortedInventoryItems = useMemo(() => {
    if (!currentInventoryItems) return [];

    const sortableItems = [...currentInventoryItems];

    sortableItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
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
          aValue = a.calculated_weight;
          bValue = b.calculated_weight;
          break;
        case "brand": // Handle sorting for brand
          aValue = a.items.brand;
          bValue = b.items.brand;
          break;
        case "item_type": // Handle sorting for item_type
          aValue = a.items.item_type;
          bValue = b.items.item_type;
          break;
        default:
          aValue = a.items.name; // Default sort by name
          bValue = b.items.name;
      }

      // Handle null or undefined values gracefully
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

      // Fallback for other types or if types are mixed
      const valA = String(aValue);
      const valB = String(bValue);
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
    return sortableItems;
  }, [currentInventoryItems, sortColumn, sortDirection]);

  // --- Event Handlers (can be defined here or above, but should not contain hooks) ---
  const handleAddItemToInventory = async () => {
    if (!selectedItemIdToAdd) {
      alert("Please select an item to add.");
      return;
    }
    if (!inventoryId) {
      alert("Inventory ID is missing.");
      return;
    }

    // Frontend check to prevent immediate re-add (though backend is primary check)
    const isAlreadyAdded = (currentInventoryItems || []).some(
      (invItem) => invItem.item_id === selectedItemIdToAdd
    );
    if (isAlreadyAdded) {
      alert(
        "This item has already been added to this inventory. Please select another item."
      );
      return; // No need to setSelectedItemIdToAdd here, useEffect handles it
    }

    try {
      await addInventoryItemMutation.mutateAsync({
        inventory_id: inventoryId,
        item_id: selectedItemIdToAdd,
        counted_units: 0,
      });
      alert("Item added to inventory!");
      // The useEffect for selectedItemIdToAdd will handle resetting the dropdown.
    } catch (err) {
      let errorMessage = "Unknown error adding item.";
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for Supabase unique constraint violation error code
        const supabaseError = err as Error & { code?: string };
        if (supabaseError.code === "23505") {
          errorMessage =
            "This item has already been added to this inventory. Please select another item.";
        }
      }
      alert(`Error adding item to inventory: ${errorMessage}`);
    }
  };

  const handleDeleteInventoryItem = async (
    invItemId: string,
    itemName: string
  ) => {
    if (!inventoryId) return;
    if (
      confirm(
        `Are you sure you want to remove "${itemName}" from this inventory?`
      )
    ) {
      try {
        await deleteInventoryItemMutation.mutateAsync({
          inventoryItemId: invItemId,
          inventoryId: inventoryId,
        });
        alert(`"${itemName}" removed from inventory.`);
      } catch (err) {
        alert(
          `Error removing item: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }
  };

  const handleCompleteInventory = async () => {
    if (!inventory?.id) {
      alert("Inventory ID is not available to complete.");
      return;
    }
    if (inventory.status === "completed") {
      alert("This inventory is already completed.");
      return;
    }

    if (
      confirm(
        "Are you sure you want to complete this inventory? This action cannot be undone."
      )
    ) {
      try {
        await updateInventoryMutation.mutateAsync({
          id: inventory.id,
          status: "completed",
        });
        alert(`Inventory "${inventory.name}" has been marked as completed.`);
      } catch (err) {
        alert(
          `Error completing inventory: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }
  };

  // --- Conditional Rendering for Loading and Error States (AFTER ALL HOOKS) ---
  if (isInventoryLoading || isAllItemsLoading || isCurrentItemsLoading) {
    return <LoadingSpinner />;
  }

  if (isInventoryError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
        <div className='text-center p-6 bg-white rounded-lg shadow-md'>
          <p className='text-red-500 text-lg mb-4'>
            Error loading inventory: {inventoryError?.message}
          </p>
          {inventoryError?.message.includes("Row not found") && (
            <p className='text-gray-600'>
              This inventory might not exist or you don't have permission to
              view it.
            </p>
          )}
          <button
            onClick={() => router.push("/")}
            className='mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded'
          >
            Go back to Inventories
          </button>
        </div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
        <div className='text-center p-6 bg-white rounded-lg shadow-md'>
          <p className='text-gray-600 text-lg mb-4'>Inventory not found.</p>
          <button
            onClick={() => router.push("/")}
            className='mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded'
          >
            Go back to Inventories
          </button>
        </div>
      </div>
    );
  }

  if (isAllItemsError || isCurrentItemsError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
        <div className='text-center p-6 bg-white rounded-lg shadow-md'>
          <p className='text-red-500 text-lg mb-4'>
            Error loading items:{" "}
            {allItemsError?.message || currentItemsError?.message}
          </p>
          <button
            onClick={() => router.push("/")}
            className='mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded'
          >
            Go back to Inventories
          </button>
        </div>
      </div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className='container mx-auto p-4 max-w-5xl'>
      <header className='flex flex-col px-3 sm:flex-row justify-between items-center mb-8 gap-4'>
        <h1 className='text-3xl font-bold text-gray-800 text-center sm:text-left'>
          Inventory: {inventory.name}
        </h1>
        <button
          onClick={() => router.push("/")}
          className='bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow-md w-full sm:w-auto'
        >
          Back to All Inventories
        </button>
      </header>

      <main className='bg-white p-4 sm:p-6 rounded-lg shadow-md'>
        <p className='text-lg text-gray-700 mb-2'>
          Status:{" "}
          <span className='capitalize font-medium'>{inventory.status}</span>
        </p>
        <p className='text-sm text-gray-600'>
          Created: {new Date(inventory.created_at).toLocaleDateString()} at{" "}
          {new Date(inventory.created_at).toLocaleTimeString()}
        </p>

        <h2 className='text-2xl font-semibold mt-8 mb-4'>
          Manage Items in This Inventory
        </h2>

        <div className='border p-4 rounded bg-blue-50 mb-6 flex flex-wrap items-center gap-4'>
          <label htmlFor='selectItem' className='text-lg font-medium'>
            Add an existing item:
          </label>
          <select
            id='selectItem'
            value={selectedItemIdToAdd}
            onChange={(e) => setSelectedItemIdToAdd(e.target.value)}
            className='flex-grow min-w-[150px] p-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            disabled={
              addInventoryItemMutation.isPending ||
              availableItemsToAdd.length === 0
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
              availableItemsToAdd.length === 0 || // Disable if no items to add
              !selectedItemIdToAdd // Disable if no item is currently selected in dropdown
            }
            className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addInventoryItemMutation.isPending ? "Adding..." : "Add Item"}
          </button>
        </div>

        <div className='overflow-x-auto'>
          {sortedInventoryItems && sortedInventoryItems.length === 0 ? (
            <p className='text-gray-600 text-center py-8'>
              This inventory has no items yet. Add some from the dropdown above!
            </p>
          ) : (
            <table className='min-w-full bg-white border border-gray-200'>
              <thead>
                <tr className='bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("name")}
                  >
                    Item Name
                    {sortColumn === "name" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("brand")}
                  >
                    Brand
                    {sortColumn === "brand" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("item_type")}
                  >
                    Item Type
                    {sortColumn === "item_type" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("unit_type")}
                  >
                    Unit Type
                    {sortColumn === "unit_type" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("upc_number")}
                  >
                    UPC Number
                    {sortColumn === "upc_number" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("counted_units")}
                  >
                    Count (Units)
                    {sortColumn === "counted_units" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    className='py-3 px-4 border-b cursor-pointer hover:bg-gray-200'
                    onClick={() => handleSort("calculated_weight")}
                  >
                    Total Weight (lbs)
                    {sortColumn === "calculated_weight" &&
                      (sortDirection === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th className='py-3 px-4 border-b text-center'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedInventoryItems?.map((invItem) => (
                  <tr key={invItem.id} className='hover:bg-gray-50'>
                    <td className='py-2 px-4 border-b'>{invItem.items.name}</td>
                    <td className='py-2 px-4 border-b'>
                      {invItem.items.brand || "N/A"}{" "}
                    </td>
                    <td className='py-2 px-4 border-b capitalize'>
                      {invItem.items.item_type || "N/A"}{" "}
                    </td>
                    <td className='py-2 px-4 border-b capitalize'>
                      {invItem.items.unit_type}
                    </td>
                    <td className='py-2 px-4 border-b'>
                      {invItem.items.upc_number || "N/A"}{" "}
                    </td>
                    <td className='py-2 px-4 border-b'>
                      {invItem.counted_units} units
                    </td>
                    <td className='py-2 px-4 border-b'>
                      {invItem.items.unit_type === "weight"
                        ? `${
                            invItem.calculated_weight?.toFixed(2) || "0.00"
                          } lbs`
                        : "-"}
                    </td>
                    <td className='py-2 px-4 border-b text-center space-x-2 space-y-2'>
                      <button
                        onClick={() =>
                          router.push(
                            `/inventories/${inventoryId}/items/${invItem.id}`
                          )
                        }
                        className='bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-2 rounded'
                      >
                        View / Edit
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteInventoryItem(
                            invItem.id,
                            invItem.items.name
                          )
                        }
                        className='bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded'
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {inventory.status !== "completed" && (
          <div className='mt-8 text-right'>
            <button
              onClick={handleCompleteInventory}
              disabled={updateInventoryMutation.isPending}
              className='bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-6 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {updateInventoryMutation.isPending
                ? "Completing..."
                : "Complete Inventory"}
            </button>
          </div>
        )}
        {inventory.status === "completed" && (
          <div className='mt-8 text-right text-lg text-green-700 font-semibold'>
            This inventory is completed.
          </div>
        )}
      </main>
    </div>
  );
}
