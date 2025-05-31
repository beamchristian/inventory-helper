"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAddItem } from "../../../hooks/useAddItem"; // Adjust the path if necessary

export default function AddItemPage() {
  const router = useRouter();
  const addItemMutation = useAddItem(); // Initialize the mutation hook

  // State variables for form inputs
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState<"quantity" | "weight">("quantity");
  const [upcNumber, setUpcNumber] = useState("");
  // Use '' for number inputs when empty, as it aligns with HTML input behavior
  const [averageWeightPerUnit, setAverageWeightPerUnit] = useState<number | "">(
    ""
  );
  // ADD THESE TWO LINES:
  const [itemType, setItemType] = useState("");
  const [brand, setBrand] = useState("");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior

    // --- Basic Client-Side Validation ---
    if (!name.trim()) {
      alert("Item Name is required.");
      return;
    }

    // ADD THESE LINES:
    if (!itemType.trim()) {
      alert("Item Type is required.");
      return;
    }
    if (!brand.trim()) {
      alert("Brand is required.");
      return;
    }

    if (unitType === "weight") {
      // Ensure averageWeightPerUnit is a valid positive number for 'weight' type
      const parsedWeight = Number(averageWeightPerUnit);
      if (
        averageWeightPerUnit === "" ||
        isNaN(parsedWeight) ||
        parsedWeight <= 0
      ) {
        alert(
          "Average Weight per Unit must be a positive number for weight items."
        );
        return;
      }
    }

    try {
      await addItemMutation.mutateAsync({
        name: name.trim(),
        unit_type: unitType,
        upc_number: upcNumber.trim() || null,
        average_weight_per_unit:
          unitType === "weight"
            ? typeof averageWeightPerUnit === "number"
              ? averageWeightPerUnit
              : Number(averageWeightPerUnit)
            : null,
        // ADD THESE TWO PROPERTIES:
        item_type: itemType.trim(),
        brand: brand.trim(),
      });

      alert("Item added successfully!");
      // Optionally reset the form fields after successful submission
      setName("");
      setUnitType("quantity");
      setUpcNumber("");
      setAverageWeightPerUnit("");
      // ADD THESE TWO LINES:
      setItemType("");
      setBrand("");

      // Redirect to a suitable page after adding the item.
      // If you have a specific page that lists all master items (e.g., /items), redirect there.
      // For now, let's redirect back to the home page (which often lists inventories).
      router.push("/");
    } catch (error) {
      console.error("Failed to add item:", error);
      alert(
        `Error adding item: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <div className='container mx-auto p-4 max-w-2xl'>
      <header className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-gray-800'>
          Add New Master Item
        </h1>
        <button
          onClick={() => router.back()} // Allows going back to the previous page
          className='bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow-md'
        >
          Back
        </button>
      </header>

      <main className='bg-white p-6 rounded-lg shadow-md'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Item Name Input */}
          <div>
            <label
              htmlFor='name'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Item Name: <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              required // HTML5 validation for required field
            />
          </div>
          {/* ADD THIS ENTIRE DIV BLOCK for Item Category: */}
          <div>
            <label
              htmlFor='itemType'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Item Category: <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              id='itemType'
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              required
            />
          </div>

          {/* ADD THIS ENTIRE DIV BLOCK for Brand: */}
          <div>
            <label
              htmlFor='brand'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Brand: <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              id='brand'
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              required
            />
          </div>

          {/* Unit Type Select */}
          <div>
            <label
              htmlFor='unitType'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              Unit Type: <span className='text-red-500'>*</span>
            </label>
            <select
              id='unitType'
              value={unitType}
              onChange={(e) =>
                setUnitType(e.target.value as "quantity" | "weight")
              }
              className='shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              required
            >
              <option value='quantity'>Quantity (e.g., each, box)</option>
              <option value='weight'>Weight (e.g., lbs, kg)</option>
            </select>
          </div>

          {/* Average Weight per Unit Input (Conditional) */}
          {unitType === "weight" && (
            <div>
              <label
                htmlFor='averageWeightPerUnit'
                className='block text-gray-700 text-sm font-bold mb-2'
              >
                Average Weight per Unit (lbs):{" "}
                <span className='text-red-500'>*</span>
              </label>
              <input
                type='number'
                id='averageWeightPerUnit'
                step='any' // Allows decimal numbers
                value={averageWeightPerUnit}
                onChange={(e) => {
                  const val = e.target.value;
                  // Set to empty string if input is empty, otherwise convert to Number
                  setAverageWeightPerUnit(val === "" ? "" : Number(val));
                }}
                className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                placeholder='e.g., 0.5 for half a pound'
                required // Required because it's a 'weight' type item
                min='0' // Ensure non-negative weight
              />
            </div>
          )}

          {/* UPC Number Input */}
          <div>
            <label
              htmlFor='upcNumber'
              className='block text-gray-700 text-sm font-bold mb-2'
            >
              UPC Number (Optional):
            </label>
            <input
              type='text'
              id='upcNumber'
              value={upcNumber}
              onChange={(e) => setUpcNumber(e.target.value)}
              className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              maxLength={12} // Common UPC length (adjust if needed)
            />
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={addItemMutation.isPending} // Disable button while submitting
            className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {addItemMutation.isPending ? "Adding Item..." : "Add Item"}
          </button>
        </form>
      </main>
    </div>
  );
}
