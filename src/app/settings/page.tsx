"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useItems,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
} from "../../hooks/useItems"; // Adjust path
import { Item } from "../../types"; // Adjust path
import { supabase } from "../../lib/supabase"; // Adjust path

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className='flex justify-center items-center h-20'>
    {/* Using the primary color variable for the spinner border */}
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

// Define the type for sortable columns
type SortColumn =
  | "name"
  | "upc_number"
  | "unit_type"
  | "average_weight_per_unit"
  | "item_type"
  | "brand";

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const { data: items, isLoading, isError, error } = useItems();
  const addItemMutation = useAddItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

  // State for sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // You can adjust this value

  // State for the "Add New Item" form
  const [newItemForm, setNewItemForm] = useState<
    Omit<Item, "id" | "created_at" | "updated_at" | "user_id">
  >({
    name: "",
    upc_number: null,
    average_weight_per_unit: null,
    unit_type: "quantity", // Default to 'quantity'
    item_type: null,
    brand: null,
  });

  // State for the "Edit Item" form (when an item is being edited)
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Handler for changes in the "Add New Item" form
  const handleNewItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setNewItemForm((prev) => {
      let updatedValue: string | number | null = value;
      if (type === "number") {
        updatedValue = value === "" ? null : Number(value);
      }
      // If unit_type changes to quantity, reset average_weight_per_unit
      if (name === "unit_type" && value === "quantity") {
        return { ...prev, [name]: value, average_weight_per_unit: null };
      }
      return { ...prev, [name]: updatedValue };
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure average_weight_per_unit is null if unit_type is 'quantity'
      const itemToSave = {
        ...newItemForm,
        average_weight_per_unit:
          newItemForm.unit_type === "quantity"
            ? null
            : newItemForm.average_weight_per_unit,
      };
      await addItemMutation.mutateAsync(itemToSave);
      setNewItemForm({
        // Reset form to initial state
        name: "",
        upc_number: null,
        average_weight_per_unit: null,
        unit_type: "quantity",
        item_type: null,
        brand: null,
      });
      alert("Item added successfully!");
    } catch (err) {
      alert(
        `Error adding item: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Handler for changes in the "Edit Item" form
  const handleEditItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setEditingItem((prev) => {
      if (!prev) return null;
      let updatedValue: string | number | null = value;
      if (type === "number") {
        updatedValue = value === "" ? null : Number(value);
      }
      // If unit_type changes to quantity, reset average_weight_per_unit
      if (name === "unit_type" && value === "quantity") {
        return { ...prev, [name]: value, average_weight_per_unit: null };
      }
      return { ...prev, [name]: updatedValue };
    });
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      // Ensure average_weight_per_unit is null if unit_type is 'quantity'
      const itemToUpdate = {
        ...editingItem,
        average_weight_per_unit:
          editingItem.unit_type === "quantity"
            ? null
            : editingItem.average_weight_per_unit,
      };
      await updateItemMutation.mutateAsync(itemToUpdate); // Pass the updated item with corrected weight
      setEditingItem(null); // Exit edit mode
      alert("Item updated successfully!");
    } catch (err) {
      alert(
        `Error updating item: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this item? This action cannot be undone."
      )
    ) {
      try {
        await deleteItemMutation.mutateAsync(itemId);
        alert("Item deleted successfully!");
      } catch (err) {
        alert(
          `Error deleting item: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }
  };

  // Sorting logic
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // If the same column is clicked, reverse the sort direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If a new column is clicked, sort by that column in ascending order
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Memoize sorted and paginated items to prevent unnecessary re-renders
  const paginatedItems = useMemo(() => {
    if (!items) return [];

    const sortableItems = [...items]; // Create a shallow copy to avoid mutating the original array

    sortableItems.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

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

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortableItems.slice(startIndex, endIndex);
  }, [items, sortColumn, sortDirection, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!items) return 0;
    return Math.ceil(items.length / itemsPerPage);
  }, [items, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  if (!userId) {
    return <LoadingSpinner />; // Or a message like "Please log in"
  }

  return (
    <div className='container mx-auto p-4 max-w-4xl'>
      <h1 className='text-3xl font-bold mb-6 text-center text-foreground'>
        Manage Inventory Items
      </h1>

      {/* Add New Item Form */}
      <div className='bg-background-surface p-6 rounded-lg shadow-md mb-8 border border-border-base'>
        <h2 className='text-2xl font-semibold mb-4 text-foreground'>
          Add New Item
        </h2>
        <form
          onSubmit={handleAddItem}
          className='grid grid-cols-1 md:grid-cols-2 gap-4'
        >
          {/* Name */}
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
          {/* UPC Number */}
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
          {/* Unit Type (Quantity/Weight) */}
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
          {/* Average Weight Per Unit (conditionally rendered) */}
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
          {/* Item Type */}
          <div>
            <label
              htmlFor='newItemType'
              className='block text-text-base text-sm font-bold mb-2'
            >
              Item Type (e.g., Meat, Cheese):
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
          {/* Brand */}
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
          {/* Submit Button */}
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

      {/* Item List */}
      <div className='bg-background-surface p-6 rounded-lg shadow-md border border-border-base'>
        <h2 className='text-2xl font-semibold mb-4 text-foreground'>
          Your Inventory Items
        </h2>
        {isLoading && <LoadingSpinner />}
        {isError && (
          <p className='text-error'>Error loading items: {error?.message}</p>
        )}
        {!isLoading && !isError && items && items.length === 0 && (
          <p className='text-text-muted'>
            No items added yet. Use the form above to add your first item!
          </p>
        )}
        {!isLoading && !isError && items && items.length > 0 && (
          <>
            <div className='overflow-x-auto'>
              <table className='min-w-full bg-background-surface border border-border-base'>
                <thead>
                  <tr className='bg-background-base text-left text-xs font-semibold text-text-muted uppercase tracking-wider'>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/80'
                      onClick={() => handleSort("name")}
                    >
                      Name
                      {sortColumn === "name" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/80'
                      onClick={() => handleSort("upc_number")}
                    >
                      UPC
                      {sortColumn === "upc_number" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/80'
                      onClick={() => handleSort("unit_type")}
                    >
                      Unit Type
                      {sortColumn === "unit_type" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/80'
                      onClick={() => handleSort("average_weight_per_unit")}
                    >
                      Avg. Weight
                      {sortColumn === "average_weight_per_unit" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/80'
                      onClick={() => handleSort("item_type")}
                    >
                      Item Type
                      {sortColumn === "item_type" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th
                      className='py-3 px-4 border-b border-border-base cursor-pointer hover:bg-background-base/80'
                      onClick={() => handleSort("brand")}
                    >
                      Brand
                      {sortColumn === "brand" &&
                        (sortDirection === "asc" ? " ↑" : " ↓")}
                    </th>
                    <th className='py-3 px-4 border-b border-border-base text-center text-text-muted'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <React.Fragment key={item.id}>
                      {editingItem && editingItem.id === item.id ? (
                        // Edit Form Row
                        <tr>
                          <td
                            colSpan={7}
                            className='p-4 border-b border-border-base bg-background-base'
                          >
                            <form
                              onSubmit={handleUpdateItem}
                              className='grid grid-cols-1 md:grid-cols-3 gap-2 items-end'
                            >
                              <input
                                type='text'
                                name='name'
                                value={editingItem.name}
                                onChange={handleEditItemChange}
                                required
                                placeholder='Name'
                                className='p-2 border border-border-base rounded bg-background text-foreground'
                              />
                              <input
                                type='text'
                                name='upc_number'
                                value={editingItem.upc_number || ""}
                                onChange={handleEditItemChange}
                                placeholder='UPC'
                                className='p-2 border border-border-base rounded bg-background text-foreground'
                              />
                              <select
                                name='unit_type'
                                value={editingItem.unit_type}
                                onChange={handleEditItemChange}
                                required
                                className='p-2 border border-border-base rounded bg-background text-foreground'
                              >
                                <option value='quantity'>Quantity</option>
                                <option value='weight'>Weight</option>
                              </select>
                              {editingItem.unit_type === "weight" && (
                                <input
                                  type='number'
                                  name='average_weight_per_unit'
                                  step='0.01'
                                  value={
                                    editingItem.average_weight_per_unit || ""
                                  }
                                  onChange={handleEditItemChange}
                                  required={editingItem.unit_type === "weight"}
                                  placeholder='Avg. Weight'
                                  className='p-2 border border-border-base rounded bg-background text-foreground'
                                />
                              )}
                              <input
                                type='text'
                                name='item_type'
                                value={editingItem.item_type || ""}
                                onChange={handleEditItemChange}
                                placeholder='Item Type'
                                className='p-2 border border-border-base rounded bg-background text-foreground'
                              />
                              <input
                                type='text'
                                name='brand'
                                value={editingItem.brand || ""}
                                onChange={handleEditItemChange}
                                placeholder='Brand'
                                className='p-2 border border-border-base rounded bg-background text-foreground'
                              />
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
                          </td>
                        </tr>
                      ) : (
                        // Display Row
                        <tr className='hover:bg-background-base'>
                          <td className='py-2 px-4 border-b border-border-base text-foreground'>
                            {item.name}
                          </td>
                          <td className='py-2 px-4 border-b border-border-base text-text-muted'>
                            {item.upc_number || "-"}
                          </td>
                          <td className='py-2 px-4 border-b border-border-base capitalize text-foreground'>
                            {item.unit_type}
                          </td>
                          <td className='py-2 px-4 border-b border-border-base text-text-muted'>
                            {item.unit_type === "weight"
                              ? `${
                                  item.average_weight_per_unit?.toFixed(2) ||
                                  "N/A"
                                } lbs`
                              : "-"}
                          </td>
                          <td className='py-2 px-4 border-b border-border-base text-foreground'>
                            {item.item_type || "-"}
                          </td>
                          <td className='py-2 px-4 border-b border-border-base text-text-muted'>
                            {item.brand || "-"}
                          </td>
                          <td className='py-2 px-4 border-b border-border-base text-center'>
                            <button
                              onClick={() => setEditingItem(item)}
                              className='bg-accent hover:bg-accent/80 text-text-inverse text-sm py-1 px-2 rounded mb-2 mr-2'
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className='bg-error hover:bg-error/80 text-text-inverse text-sm py-1 px-2 rounded'
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className='flex justify-between items-center mt-4'>
              <div>
                <label htmlFor='itemsPerPage' className='text-text-base mr-2'>
                  Items per page:
                </label>
                <select
                  id='itemsPerPage'
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className='border border-border-base rounded py-1 px-2 bg-background text-foreground'
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className='flex space-x-2'>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className='bg-secondary hover:bg-secondary/80 text-text-inverse text-sm py-1 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Previous
                </button>
                <span className='text-text-base py-1 px-3'>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className='bg-secondary hover:bg-secondary/80 text-text-inverse text-sm py-1 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
