// src/components/InventoryClientPage.tsx
"use client"; // This directive makes this a Client Component

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // For navigation within the client component

// Import your custom hooks for inventories
import {
  useInventories,
  useCreateInventory,
  useDeleteInventory,
} from "../hooks/useInventories"; // Adjust path if necessary based on your project structure

// Import your Inventory type
import { Inventory } from "../types"; // Adjust path if necessary

/**
 * LoadingSpinner Component
 * Displays a simple animated spinner.
 */
const LoadingSpinner: React.FC = () => (
  <div className='flex justify-center items-center h-20'>
    {/* Using primary color for spinner border */}
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

/**
 * InventoryClientPage Component
 * Handles all client-side logic and interactions for the inventory list page.
 * It fetches, creates, and deletes inventories.
 */
const InventoryClientPage: React.FC = () => {
  const router = useRouter(); // Initialize Next.js router for client-side navigation

  // React Query hooks for data fetching and mutations
  // These hooks manage loading states, errors, and data caching.
  const { data: inventories, isLoading, isError, error } = useInventories();
  const createInventoryMutation = useCreateInventory();
  const deleteInventoryMutation = useDeleteInventory();

  // State for the new inventory name input field
  const [newInventoryName, setNewInventoryName] = useState<string>("");

  /**
   * handleCreateInventory
   * Handles the submission of the form to create a new inventory.
   * @param e - The form event.
   */
  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Basic validation for the input field
    if (!newInventoryName.trim()) {
      // Using a custom modal/toast message instead of alert() for better UX
      // For this example, we'll use console.error and a simple UI message.
      console.error("Inventory name cannot be empty.");
      // You would replace this with a proper UI notification (e.g., a toast library)
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        messageBox.innerText = "Inventory name cannot be empty.";
        messageBox.style.display = "block";
        setTimeout(() => (messageBox.style.display = "none"), 3000);
      }
      return;
    }

    try {
      // Call the create inventory mutation with the new name
      const newInventory = await createInventoryMutation.mutateAsync({
        name: newInventoryName.trim(),
        status: "draft", // Assign a default status as per your schema
        settings: {}, // Assign default empty object for JSON settings
      });
      setNewInventoryName(""); // Clear the input field after successful creation

      // Notify user of success (replace with UI notification)
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        messageBox.innerText = `Inventory "${newInventory.name}" created successfully!`;
        messageBox.style.display = "block";
        setTimeout(() => (messageBox.style.display = "none"), 3000);
      }

      // Optionally redirect to the newly created inventory's detail page
      router.push(`/inventories/${newInventory.id}`);
    } catch (err) {
      // Handle errors during creation (replace with UI notification)
      console.error("Error creating inventory:", err);
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        messageBox.innerText = `Error creating inventory: ${
          err instanceof Error ? err.message : "Unknown error"
        }`;
        messageBox.style.display = "block";
        setTimeout(() => (messageBox.style.display = "none"), 5000);
      }
    }
  };

  /**
   * handleDeleteInventory
   * Handles the deletion of an existing inventory.
   * @param inventoryId - The ID of the inventory to delete.
   * @param inventoryName - The name of the inventory for confirmation message.
   */
  const handleDeleteInventory = async (
    inventoryId: string,
    inventoryName: string
  ) => {
    // Custom confirmation dialog instead of window.confirm()
    // You would replace this with a proper UI confirmation modal.
    const userConfirmed = window.confirm(
      // Using window.confirm for now, but recommend replacing with custom modal
      `Are you sure you want to delete inventory "${inventoryName}"? This cannot be undone.`
    );

    if (userConfirmed) {
      try {
        await deleteInventoryMutation.mutateAsync(inventoryId);
        // Notify user of success (replace with UI notification)
        const messageBox = document.getElementById("messageBox");
        if (messageBox) {
          messageBox.innerText = `Inventory "${inventoryName}" deleted.`;
          messageBox.style.display = "block";
          setTimeout(() => (messageBox.style.display = "none"), 3000);
        }
      } catch (err) {
        // Handle errors during deletion (replace with UI notification)
        console.error("Error deleting inventory:", err);
        const messageBox = document.getElementById("messageBox");
        if (messageBox) {
          messageBox.innerText = `Error deleting inventory: ${
            err instanceof Error ? err.message : "Unknown error"
          }`;
          messageBox.style.display = "block";
          setTimeout(() => (messageBox.style.display = "none"), 5000);
        }
      }
    }
  };

  return (
    // Use background-base for the main page background
    <div className='min-h-screen bg-background-base p-4'>
      {/* Custom Message Box for alerts */}
      <div
        id='messageBox'
        className='fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-lg shadow-lg z-50 hidden'
        style={{ display: "none" }}
      ></div>

      <header className='flex justify-center items-center mb-8 max-w-4xl mx-auto'>
        {/* Use text-base for heading text */}
        <h1 className='text-4xl font-bold text-text-base'>Your Inventories</h1>
      </header>

      <main className='max-w-4xl mx-auto'>
        {/* Create New Inventory Form */}
        {/* Use background-surface for cards/panels */}
        <div className='bg-background-surface p-6 rounded-lg shadow-md mb-8'>
          {/* Use text-base for heading */}
          <h2 className='text-2xl font-semibold mb-4 text-text-base'>
            Start a New Inventory
          </h2>
          <form onSubmit={handleCreateInventory} className='flex gap-4'>
            <input
              type='text'
              placeholder="Enter inventory name (e.g., 'Weekly Count - May 27')"
              value={newInventoryName}
              onChange={(e) => setNewInventoryName(e.target.value)}
              required
              // Use text-base for input text and border-border-base for border
              className='flex-grow shadow appearance-none border border-border-base rounded w-full py-2 px-3 text-text-base leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-primary'
            />
            {/* Use success color for create button */}
            <button
              type='submit'
              disabled={createInventoryMutation.isPending}
              className='bg-success hover:bg-success/90 text-text-inverse font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {createInventoryMutation.isPending
                ? "Creating..."
                : "Create Inventory"}
            </button>
          </form>
        </div>

        {/* Inventory List */}
        {/* Use background-surface for cards/panels */}
        <div className='bg-background-surface p-6 rounded-lg shadow-md'>
          {/* Use text-base for heading */}
          <h2 className='text-2xl font-semibold mb-4 text-text-base'>
            Past Inventories
          </h2>
          {isLoading && <LoadingSpinner />}
          {isError && (
            // Use error color for error message
            <p className='text-error'>
              Error loading inventories: {error?.message}
            </p>
          )}
          {!isLoading &&
            !isError &&
            inventories &&
            inventories.length === 0 && (
              // Use text-muted for informational text
              <p className='text-text-muted'>
                No inventories found. Start a new one above!
              </p>
            )}
          {!isLoading && !isError && inventories && inventories.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {inventories.map((inventory: Inventory) => (
                <div
                  key={inventory.id}
                  // Use background-base for card background and border-border-base for border
                  className='border border-border-base p-4 rounded-lg shadow-sm bg-background-base flex flex-col justify-between transition-colors'
                >
                  <div>
                    {/* Use text-base for heading */}
                    <h3 className='text-xl font-semibold text-text-base mb-2'>
                      {inventory.name}
                    </h3>
                    {/* Use text-muted for metadata */}
                    <p className='text-sm text-text-muted'>
                      Status:{" "}
                      <span className='capitalize font-medium'>
                        {inventory.status}
                      </span>
                    </p>
                    <p className='text-sm text-text-muted mb-4'>
                      Created:{" "}
                      {new Date(inventory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className='flex space-x-2 mt-4'>
                    {/* Use primary color for view/resume button */}
                    <button
                      onClick={() =>
                        router.push(`/inventories/${inventory.id}`)
                      }
                      className='flex-grow bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-3 rounded text-sm transition-colors'
                    >
                      View/Resume
                    </button>
                    {/* Use error color for delete button */}
                    <button
                      onClick={() =>
                        handleDeleteInventory(inventory.id, inventory.name)
                      }
                      disabled={deleteInventoryMutation.isPending}
                      className='bg-error hover:bg-error/90 text-text-inverse font-bold py-2 px-3 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InventoryClientPage;
