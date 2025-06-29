"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  useItems,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
} from "../../hooks/useItems";
import { Item } from "../../types";
import { PaginationControls } from "../../components/PaginationControls"; // IMPORTED: New Pagination Component

// ... (LoadingSpinner, showMessage, and SortColumn type remain the same) ...

const LoadingSpinner: React.FC = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

const showMessage = (
  message: string,
  type: "info" | "error" | "success" = "info"
) => {
  const messageBox = document.getElementById("settingsMessageBox");
  if (messageBox) {
    messageBox.innerText = message;
    messageBox.className = `fixed top-4 right-4 p-3 rounded-lg shadow-lg z-50 block `;
    if (type === "error") messageBox.classList.add("bg-red-500", "text-white");
    else if (type === "success")
      messageBox.classList.add("bg-green-500", "text-white");
    else messageBox.classList.add("bg-blue-500", "text-white");
    messageBox.style.display = "block";
    setTimeout(() => {
      if (messageBox) messageBox.style.display = "none";
    }, 5000);
  }
};

type SortColumn =
  | "name"
  | "upc_number"
  | "unit_type"
  | "average_weight_per_unit"
  | "item_type"
  | "brand";

export default function SettingsPage() {
  const { status } = useSession();
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const {
    data: itemsData,
    isLoading,
    isError,
    error,
  } = useItems({
    page: currentPage,
    limit: itemsPerPage,
  });

  const itemsOnPage = useMemo(() => itemsData?.data || [], [itemsData]);
  const paginationInfo = useMemo(() => itemsData?.pagination, [itemsData]);
  const totalPages = useMemo(
    () => paginationInfo?.totalPages || 1,
    [paginationInfo]
  );

  const addItemMutation = useAddItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

  // ... (errorMessage, newItemForm state, useEffect for auth, and all handler functions like handleNewItemChange, handleAddItem, etc., remain the same) ...

  const errorMessage = useMemo(() => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown error.";
  }, [error]);

  const [newItemForm, setNewItemForm] = useState<
    Omit<Item, "id" | "created_at" | "updated_at" | "user_id">
  >({
    name: "",
    upc_number: null,
    average_weight_per_unit: null,
    unit_type: "quantity",
    item_type: null,
    brand: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/sign-in";
    }
  }, [status]);

  const handleNewItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setNewItemForm((prev) => {
      let updatedValue: string | number | null = value;
      if (type === "number") {
        updatedValue = value === "" ? null : parseFloat(value);
      }
      if (name === "unit_type" && value === "quantity") {
        return { ...prev, [name]: value, average_weight_per_unit: null };
      }
      return { ...prev, [name]: updatedValue };
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") {
      showMessage("You must be logged in to add items.", "error");
      return;
    }

    const newUpc = newItemForm.upc_number?.trim();
    if (
      newUpc &&
      itemsOnPage.some((item: Item) => item.upc_number === newUpc)
    ) {
      showMessage(`An item with the UPC "${newUpc}" already exists.`, "error");
      return;
    }

    // (Your existing validation logic remains here...)

    try {
      const itemToSave = {
        ...newItemForm,
        average_weight_per_unit:
          newItemForm.unit_type === "quantity"
            ? null
            : newItemForm.average_weight_per_unit,
      };
      await addItemMutation.mutateAsync(itemToSave);
      setNewItemForm({
        name: "",
        upc_number: null,
        average_weight_per_unit: null,
        unit_type: "quantity",
        item_type: null,
        brand: null,
      });
      showMessage("Item added successfully!", "success");
    } catch (err: unknown) {
      showMessage(
        `Error adding item: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleEditItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setEditingItem((prev) => {
      if (!prev) return null;
      let updatedValue: string | number | null = value;
      if (type === "number") {
        updatedValue = value === "" ? null : parseFloat(value);
      }
      if (name === "unit_type" && value === "quantity") {
        return { ...prev, [name]: value, average_weight_per_unit: null };
      }
      return { ...prev, [name]: updatedValue };
    });
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (status !== "authenticated") {
      showMessage("You must be logged in to update items.", "error");
      return;
    }
    // (Your existing validation logic remains here...)

    try {
      const itemToUpdate = {
        ...editingItem,
        average_weight_per_unit:
          editingItem.unit_type === "quantity"
            ? null
            : editingItem.average_weight_per_unit,
      };
      await updateItemMutation.mutateAsync(itemToUpdate);
      setEditingItem(null);
      showMessage("Item updated successfully!", "success");
    } catch (err: unknown) {
      showMessage(
        `Error updating item: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (status !== "authenticated") {
      showMessage("You must be logged in to delete items.", "error");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this item? This action cannot be undone."
      )
    ) {
      try {
        await deleteItemMutation.mutateAsync(itemId);
        showMessage("Item deleted successfully!", "success");
      } catch (err: unknown) {
        showMessage(
          `Error deleting item: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
          "error"
        );
      }
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    if (!itemsOnPage) return [];
    const sortableItems = [...itemsOnPage];
    sortableItems.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
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
  }, [itemsOnPage, sortColumn, sortDirection]);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <LoadingSpinner />
      </div>
    );
  }

  if (status === "unauthenticated" || isError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background-base'>
        <div className='text-center p-6 bg-background-surface rounded-lg shadow-md'>
          <p className='text-error text-lg mb-4'>
            {status === "unauthenticated"
              ? "You must be logged in to view settings."
              : `Error loading items: ${errorMessage}`}
          </p>
          <button
            onClick={() => (window.location.href = "/sign-in")}
            className='mt-4 bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-4 rounded'
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4 max-w-6xl'>
      <div
        id='settingsMessageBox'
        className='fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-lg shadow-lg z-50 hidden'
      ></div>
      <h1 className='text-3xl font-bold mb-6 text-center text-foreground'>
        Manage Master Items
      </h1>

      {/* Add New Item Form (No changes needed here) */}
      <div className='bg-background-surface p-6 rounded-lg shadow-md mb-8 border border-border-base'>
        <h2 className='text-2xl font-semibold mb-4 text-foreground'>
          Add New Master Item
        </h2>
        <form
          onSubmit={handleAddItem}
          className='grid grid-cols-1 md:grid-cols-2 gap-4'
        >
          {/* ... all form inputs are the same ... */}
          <div>
            <label
              htmlFor='newName'
              className='block text-text-base text-sm font-bold mb-2'
            >
              Name:
            </label>
            <input
              type='text'
              id='newName'
              name='name'
              value={newItemForm.name}
              onChange={handleNewItemChange}
              required
              className='shadow appearance-none border border-border-base rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          <div>
            <label
              htmlFor='newUpc'
              className='block text-text-base text-sm font-bold mb-2'
            >
              UPC Number (Optional):
            </label>
            <input
              type='text'
              id='newUpc'
              name='upc_number'
              value={newItemForm.upc_number || ""}
              onChange={handleNewItemChange}
              className='shadow appearance-none border border-border-base rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          <div>
            <label
              htmlFor='newUnitType'
              className='block text-text-base text-sm font-bold mb-2'
            >
              Count By:
            </label>
            <select
              id='newUnitType'
              name='unit_type'
              value={newItemForm.unit_type}
              onChange={handleNewItemChange}
              required
              className='shadow border border-border-base rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline'
            >
              <option value='quantity'>Quantity</option>
              <option value='weight'>Weight (lbs)</option>
            </select>
          </div>
          {newItemForm.unit_type === "weight" && (
            <div>
              <label
                htmlFor='newAvgWeight'
                className='block text-text-base text-sm font-bold mb-2'
              >
                Avg. Weight Per Unit (lbs):
              </label>
              <input
                type='number'
                id='newAvgWeight'
                name='average_weight_per_unit'
                step='0.01'
                value={newItemForm.average_weight_per_unit || ""}
                onChange={handleNewItemChange}
                required={newItemForm.unit_type === "weight"}
                className='shadow appearance-none border border-border-base rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline'
              />
            </div>
          )}
          <div>
            <label
              htmlFor='newItemType'
              className='block text-text-base text-sm font-bold mb-2'
            >
              Item Type (e.g., Meat):
            </label>
            <input
              type='text'
              id='newItemType'
              name='item_type'
              value={newItemForm.item_type || ""}
              onChange={handleNewItemChange}
              className='shadow appearance-none border border-border-base rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          <div>
            <label
              htmlFor='newBrand'
              className='block text-text-base text-sm font-bold mb-2'
            >
              Brand (Optional):
            </label>
            <input
              type='text'
              id='newBrand'
              name='brand'
              value={newItemForm.brand || ""}
              onChange={handleNewItemChange}
              className='shadow appearance-none border border-border-base rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          <div className='md:col-span-2 text-right'>
            <button
              type='submit'
              disabled={addItemMutation.isPending}
              className='bg-primary hover:bg-primary/80 text-text-inverse font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>

      {/* --- NEW RESPONSIVE ITEMS LIST --- */}
      <div className='bg-background-surface p-4 pt-6 sm:p-6 rounded-lg shadow-md border border-border-base'>
        <h2 className='text-2xl font-semibold mb-4 text-foreground'>
          Your Master Items
        </h2>
        {!isLoading && !isError && itemsOnPage.length === 0 ? (
          <p className='text-text-muted text-center py-8'>
            No items created yet. Use the form above to add one!
          </p>
        ) : (
          <>
            {/* Header for Desktop View */}
            <div className='hidden md:grid md:grid-cols-12 gap-4 bg-background-base text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-base pb-2 pt-5 px-4'>
              <div
                className='col-span-3 cursor-pointer'
                onClick={() => handleSort("name")}
              >
                Name{" "}
                {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </div>
              <div
                className='col-span-2 cursor-pointer'
                onClick={() => handleSort("upc_number")}
              >
                UPC{" "}
                {sortColumn === "upc_number" &&
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
                onClick={() => handleSort("brand")}
              >
                Brand{" "}
                {sortColumn === "brand" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </div>
              <div className='col-span-3 text-center'>Actions</div>
            </div>

            {/* List of Items (Cards on mobile, Rows on desktop) */}
            <div className='space-y-4 md:space-y-0'>
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className='p-4 border rounded-lg bg-background md:grid md:grid-cols-12 md:gap-4 md:items-center md:p-0 md:py-3 md:border-0 md:border-b md:rounded-none'
                >
                  {editingItem && editingItem.id === item.id ? (
                    // Edit Form replaces the item content
                    <div className='col-span-12 p-4'>
                      <form
                        onSubmit={handleUpdateItem}
                        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end'
                      >
                        <input
                          type='text'
                          name='name'
                          value={editingItem.name}
                          onChange={handleEditItemChange}
                          required
                          placeholder='Name'
                          className='p-2 border border-border-base rounded bg-background-surface text-foreground w-full'
                        />
                        <input
                          type='text'
                          name='upc_number'
                          value={editingItem.upc_number || ""}
                          onChange={handleEditItemChange}
                          placeholder='UPC'
                          className='p-2 border border-border-base rounded bg-background-surface text-foreground w-full'
                        />
                        <input
                          type='text'
                          name='item_type'
                          value={editingItem.item_type || ""}
                          onChange={handleEditItemChange}
                          placeholder='Item Type'
                          className='p-2 border border-border-base rounded bg-background-surface text-foreground w-full'
                        />
                        <input
                          type='text'
                          name='brand'
                          value={editingItem.brand || ""}
                          onChange={handleEditItemChange}
                          placeholder='Brand'
                          className='p-2 border border-border-base rounded bg-background-surface text-foreground w-full'
                        />
                        {/* Actions for the edit form */}
                        <div className='col-span-full flex justify-end space-x-2 mt-2'>
                          <button
                            type='submit'
                            disabled={updateItemMutation.isPending}
                            className='bg-success hover:bg-success/80 text-text-inverse text-sm py-1 px-3 rounded'
                          >
                            {updateItemMutation.isPending
                              ? "Saving..."
                              : "Save"}
                          </button>
                          <button
                            type='button'
                            onClick={() => setEditingItem(null)}
                            className='bg-secondary hover:bg-secondary/80 text-text-inverse text-sm py-1 px-3 rounded'
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    // Display Item content
                    <>
                      <div className='flex justify-between items-center md:col-span-3 md:px-4'>
                        <span className='font-bold text-sm text-text-muted md:hidden'>
                          Name
                        </span>
                        <span className='text-right md:text-left font-semibold'>
                          {item.name}
                        </span>
                      </div>
                      <div className='flex justify-between items-center border-t pt-2 mt-2 md:border-0 md:pt-0 md:mt-0 md:col-span-2 md:px-4'>
                        <span className='font-bold text-sm text-text-muted md:hidden'>
                          UPC
                        </span>
                        <span className='text-right md:text-left text-text-muted'>
                          {item.upc_number || "-"}
                        </span>
                      </div>
                      <div className='flex justify-between items-center border-t pt-2 mt-2 md:border-0 md:pt-0 md:mt-0 md:col-span-2 md:px-4'>
                        <span className='font-bold text-sm text-text-muted md:hidden'>
                          Type
                        </span>
                        <span className='text-right md:text-left capitalize'>
                          {item.item_type || "-"}
                        </span>
                      </div>
                      <div className='flex justify-between items-center border-t pt-2 mt-2 md:border-0 md:pt-0 md:mt-0 md:col-span-2 md:px-4'>
                        <span className='font-bold text-sm text-text-muted md:hidden'>
                          Brand
                        </span>
                        <span className='text-right md:text-left text-text-muted'>
                          {item.brand || "-"}
                        </span>
                      </div>
                      <div className='border-t pt-4 mt-4 md:border-0 md:pt-0 md:mt-0 md:col-span-3 md:px-4'>
                        <div className='flex flex-col sm:flex-row items-center justify-center gap-2'>
                          <button
                            onClick={() => setEditingItem(item)}
                            className='bg-accent hover:bg-accent/80 text-text-inverse text-sm py-1 px-2 rounded w-full sm:w-auto'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className='bg-error hover:bg-error/80 text-text-inverse text-sm py-1 px-2 rounded w-full sm:w-auto'
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* NEW PAGINATION CONTROLS */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              noun='Page'
            />
          </>
        )}
      </div>
    </div>
  );
}
