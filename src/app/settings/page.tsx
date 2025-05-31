// src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
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
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500'></div>
  </div>
);

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const { data: items, isLoading, isError, error } = useItems();
  const addItemMutation = useAddItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

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

  if (!userId) {
    return <LoadingSpinner />; // Or a message like "Please log in"
  }

  return (
    <div className='container mx-auto p-4 max-w-4xl'>
      <h1 className='text-3xl font-bold mb-6 text-center'>
        Manage Inventory Items
      </h1>

      {/* Add New Item Form */}
      <div className='bg-white p-6 rounded-lg shadow-md mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>Add New Item</h2>
        <form
          onSubmit={handleAddItem}
          className='grid grid-cols-1 md:grid-cols-2 gap-4'
        >
          {/* Name */}
          <div>
            <label
              htmlFor='newName'
              className='block text-gray-700 text-sm font-bold mb-2'
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
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          {/* UPC Number */}
          <div>
            <label
              htmlFor='newUpc'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              UPC Number (Optional):
            </label>
            <input
              type='text'
              id='newUpc'
              name='upc_number'
              value={newItemForm.upc_number || ""}
              onChange={handleNewItemChange}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          {/* Unit Type (Quantity/Weight) */}
          <div>
            <label
              htmlFor='newUnitType'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Count By:
            </label>
            <select
              id='newUnitType'
              name='unit_type'
              value={newItemForm.unit_type}
              onChange={handleNewItemChange}
              required
              className='shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
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
                className='block text-gray-700 text-sm font-bold mb-2'
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
                className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              />
            </div>
          )}
          {/* Item Type */}
          <div>
            <label
              htmlFor='newItemType'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Item Type (e.g., Meat, Cheese):
            </label>
            <input
              type='text'
              id='newItemType'
              name='item_type'
              value={newItemForm.item_type || ""}
              onChange={handleNewItemChange}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          {/* Brand */}
          <div>
            <label
              htmlFor='newBrand'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Brand (Optional):
            </label>
            <input
              type='text'
              id='newBrand'
              name='brand'
              value={newItemForm.brand || ""}
              onChange={handleNewItemChange}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            />
          </div>
          {/* Submit Button */}
          <div className='md:col-span-2 text-right'>
            <button
              type='submit'
              disabled={addItemMutation.isPending}
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>

      {/* Item List */}
      <div className='bg-white p-6 rounded-lg shadow-md'>
        <h2 className='text-2xl font-semibold mb-4'>Your Inventory Items</h2>
        {isLoading && <LoadingSpinner />}
        {isError && (
          <p className='text-red-500'>Error loading items: {error?.message}</p>
        )}
        {!isLoading && !isError && items && items.length === 0 && (
          <p className='text-gray-600'>
            No items added yet. Use the form above to add your first item!
          </p>
        )}
        {!isLoading && !isError && items && items.length > 0 && (
          <div className='overflow-x-auto'>
            <table className='min-w-full bg-white border border-gray-200'>
              <thead>
                <tr className='bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  <th className='py-3 px-4 border-b'>Name</th>
                  <th className='py-3 px-4 border-b'>UPC</th>
                  <th className='py-3 px-4 border-b'>Unit Type</th>
                  <th className='py-3 px-4 border-b'>Avg. Weight</th>
                  <th className='py-3 px-4 border-b'>Item Type</th>
                  <th className='py-3 px-4 border-b'>Brand</th>
                  <th className='py-3 px-4 border-b text-center'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    {editingItem && editingItem.id === item.id ? (
                      // Edit Form Row
                      <tr>
                        <td colSpan={7} className='p-4 border-b bg-blue-50'>
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
                              className='p-2 border rounded'
                            />
                            <input
                              type='text'
                              name='upc_number'
                              value={editingItem.upc_number || ""}
                              onChange={handleEditItemChange}
                              placeholder='UPC'
                              className='p-2 border rounded'
                            />
                            <select
                              name='unit_type'
                              value={editingItem.unit_type}
                              onChange={handleEditItemChange}
                              required
                              className='p-2 border rounded'
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
                                className='p-2 border rounded'
                              />
                            )}
                            <input
                              type='text'
                              name='item_type'
                              value={editingItem.item_type || ""}
                              onChange={handleEditItemChange}
                              placeholder='Item Type'
                              className='p-2 border rounded'
                            />
                            <input
                              type='text'
                              name='brand'
                              value={editingItem.brand || ""}
                              onChange={handleEditItemChange}
                              placeholder='Brand'
                              className='p-2 border rounded'
                            />
                            <div className='col-span-full flex justify-end space-x-2 mt-2'>
                              <button
                                type='submit'
                                disabled={updateItemMutation.isPending}
                                className='bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded'
                              >
                                {updateItemMutation.isPending
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                              <button
                                type='button'
                                onClick={() => setEditingItem(null)}
                                className='bg-gray-400 hover:bg-gray-500 text-white text-sm py-1 px-3 rounded'
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      // Display Row
                      <tr className='hover:bg-gray-50'>
                        <td className='py-2 px-4 border-b'>{item.name}</td>
                        <td className='py-2 px-4 border-b'>
                          {item.upc_number || "-"}
                        </td>
                        <td className='py-2 px-4 border-b capitalize'>
                          {item.unit_type}
                        </td>
                        <td className='py-2 px-4 border-b'>
                          {item.unit_type === "weight"
                            ? `${
                                item.average_weight_per_unit?.toFixed(2) ||
                                "N/A"
                              } lbs`
                            : "-"}
                        </td>
                        <td className='py-2 px-4 border-b'>
                          {item.item_type || "-"}
                        </td>
                        <td className='py-2 px-4 border-b'>
                          {item.brand || "-"}
                        </td>
                        <td className='py-2 px-4 border-b text-center'>
                          <button
                            onClick={() => setEditingItem(item)}
                            className='bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-2 rounded mr-2'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className='bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded'
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
        )}
      </div>
    </div>
  );
}
