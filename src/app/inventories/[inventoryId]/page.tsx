"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Inventory } from "@/types";
import { useItems } from "@/hooks/useItems";
import {
  useInventoryItems,
  useAddInventoryItem,
  useDeleteInventoryItem,
} from "../../../hooks/useInventoryItems";
import { useUpdateInventory } from "../../../hooks/useInventories";
import { sortForItemTypeOnly } from "@/lib/utils";

const useInventoryDetails = (inventoryId: string | undefined) => {
  const [userId, setUserId] = useState<string | null>(null);

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

const LoadingSpinner = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

type InventoryItemSortColumn =
  | "name"
  | "unit_type"
  | "upc_number"
  | "counted_units"
  | "calculated_weight"
  | "brand"
  | "item_type";

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.inventoryId as string;

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

  const [sortColumn, setSortColumn] = useState<InventoryItemSortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // New state for items per page

  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");

  // 👇 NEW handler for the ITEM TYPE count mode
  const handleStartItemTypeCountMode = () => {
    if (!currentInventoryItems || currentInventoryItems.length === 0) {
      alert("There are no items in this inventory to count.");
      return;
    }
    const sortedForCount = sortForItemTypeOnly(currentInventoryItems);
    const firstItemId = sortedForCount[0].id;
    // Navigate with the 'itemType' sortMode parameter
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
    // Reset to first page when sorting changes
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
          // Need to calculate on the fly for sorting if not a direct DB column
          aValue =
            (a.counted_units || 0) * (a.items.average_weight_per_unit || 0);
          bValue =
            (b.counted_units || 0) * (b.items.average_weight_per_unit || 0);
          break;
        case "brand":
          aValue = a.items.brand;
          bValue = b.items.brand;
          break;
        case "item_type":
          aValue = a.items.item_type;
          bValue = b.items.item_type;
          break;
        default:
          aValue = a.items.name;
          bValue = b.items.name;
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

  // --- Pagination Logic ---
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

  // Handler for changing items per page
  const handleItemsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  const handleAddItemToInventory = async () => {
    if (!selectedItemIdToAdd) {
      alert("Please select an item to add.");
      return;
    }
    if (!inventoryId) {
      alert("Inventory ID is missing.");
      return;
    }

    const isAlreadyAdded = (currentInventoryItems || []).some(
      (invItem) => invItem.item_id === selectedItemIdToAdd
    );
    if (isAlreadyAdded) {
      alert(
        "This item has already been added to this inventory. Please select another item."
      );
      return;
    }

    try {
      await addInventoryItemMutation.mutateAsync({
        inventory_id: inventoryId,
        item_id: selectedItemIdToAdd,
        counted_units: 0,
      });
      alert("Item added to inventory!");
      // Re-evaluate total pages and potentially jump to the new last page if needed
      // For simplicity, we'll just invalidate and let react-query refetch.
      // If the new item goes to a new page, the user will have to navigate there manually.
      // A more complex solution might calculate the new page and set currentPage.
    } catch (err) {
      let errorMessage = "Unknown error adding item.";
      if (err instanceof Error) {
        errorMessage = err.message;
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
        // If the last item on a page is deleted, and it's not the first page,
        // navigate back one page.
        if (paginatedItems.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
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

  const isAnyLoading =
    isInventoryLoading || isAllItemsLoading || isCurrentItemsLoading;
  const isAnyError = isInventoryError || isAllItemsError || isCurrentItemsError;

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
      currentItemsError?.message;
    const isNotFound = errorMessage?.includes("Row not found");

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
      <header className='flex flex-col sm:flex-row justify-between items-center mb-8 gap-4'>
        <h1 className='text-3xl font-bold text-text-base text-center sm:text-left'>
          Inventory: {inventory.name}
        </h1>
        <div className='flex flex-col sm:flex-row gap-2'>
          {/* 👇 NEW "Count by Type" button */}
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
              availableItemsToAdd.length === 0 ||
              !selectedItemIdToAdd
            }
            className='bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addInventoryItemMutation.isPending ? "Adding..." : "Add Item"}
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
                        {invItem.items.name}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {invItem.items.brand || "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base capitalize text-text-base'>
                        {invItem.items.item_type || "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base capitalize text-text-base'>
                        {invItem.items.unit_type}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {invItem.items.upc_number || "N/A"}{" "}
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {invItem.counted_units} units
                      </td>
                      <td className='py-2 px-4 border-b border-border-base text-text-base'>
                        {invItem.items.unit_type === "weight"
                          ? `${
                              (
                                (invItem.counted_units || 0) *
                                (invItem.items.average_weight_per_unit || 0)
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
                            handleDeleteInventoryItem(
                              invItem.id,
                              invItem.items.name
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
