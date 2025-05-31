// src/app/inventories/[inventoryId]/page.tsx
"use client";

// Importing React and hooks for component creation and state management.
import React, { useEffect, useState } from "react";
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

  // Move useState for selectedItemIdToAdd back to the top
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");

  // Calculate availableItemsToAdd here. It's fine for it to be [] initially
  // when allUserItems or currentInventoryItems are undefined from useQuery.
  const availableItemsToAdd = (allUserItems || []).filter(
    (userItem) =>
      !(currentInventoryItems || []).some(
        (invItem) => invItem.item_id === userItem.id
      )
  );

  // Move useEffect for selectedItemIdToAdd back to the top
  useEffect(() => {
    // This effect runs on every render, including the first.
    // When data loads, availableItemsToAdd will change, triggering this effect again.
    if (availableItemsToAdd.length > 0 && !selectedItemIdToAdd) {
      setSelectedItemIdToAdd(availableItemsToAdd[0].id);
    }
  }, [availableItemsToAdd, selectedItemIdToAdd]);

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

    try {
      await addInventoryItemMutation.mutateAsync({
        inventory_id: inventoryId,
        item_id: selectedItemIdToAdd,
        counted_units: 0,
      });
      setSelectedItemIdToAdd("");
      alert("Item added to inventory!");
    } catch (err) {
      alert(
        `Error adding item to inventory: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
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

  // --- Main Component Render ---
  return (
    <div className='container mx-auto p-4 max-w-4xl'>
      <header className='flex flex-col sm:flex-row justify-between items-center mb-8 gap-4'>
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
              availableItemsToAdd.length === 0
            }
            className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addInventoryItemMutation.isPending ? "Adding..." : "Add Item"}
          </button>
        </div>

        <div className='overflow-x-auto'>
          {currentInventoryItems && currentInventoryItems.length === 0 ? (
            <p className='text-gray-600 text-center py-8'>
              This inventory has no items yet. Add some from the dropdown above!
            </p>
          ) : (
            <table className='min-w-full bg-white border border-gray-200'>
              <thead>
                <tr className='bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  <th className='py-3 px-4 border-b'>Item Name</th>
                  <th className='py-3 px-4 border-b'>Unit Type</th>
                  <th className='py-3 px-4 border-b'>UPC Number</th>
                  <th className='py-3 px-4 border-b'>Count (Units)</th>
                  <th className='py-3 px-4 border-b'>Total Weight (lbs)</th>
                  <th className='py-3 px-4 border-b text-center'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentInventoryItems?.map((invItem) => (
                  <tr key={invItem.id} className='hover:bg-gray-50'>
                    <td className='py-2 px-4 border-b'>{invItem.items.name}</td>
                    <td className='py-2 px-4 border-b capitalize'>
                      {invItem.items.unit_type}
                    </td>
                    <td className='py-2 px-4 border-b'>
                      {invItem.items.upc_number || "N/A"}{" "}
                    </td>
                    <td className='py-2 px-4 border-b'>
                      {invItem.counted_units} units
                    </td>
                    {/* REMOVE THIS ENTIRE TD BLOCK BELOW */}
                    {/* <td className="py-2 px-4 border-b">
                      {invItem.items.unit_type === "weight"
                        ? `${
                            invItem.items.average_weight_per_unit?.toFixed(2) ||
                            "N/A"
                          } lbs`
                        : "-"}
                    </td> */}
                    {/* END REMOVE BLOCK */}
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
