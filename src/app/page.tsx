"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  useInventories,
  useCreateInventory,
  useDeleteInventory,
} from "../hooks/useInventories";

import { Inventory } from "../types";
import { PaginationControls } from "@/components/PaginationControls";

const LoadingSpinner: React.FC = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

const HomePage: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();

  // 1. Add state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6); // e.g., 6 cards per page

  // 2. Pass pagination state to the useInventories hook
  const {
    data: paginatedData, // Rename to avoid confusion
    isLoading: isInventoriesLoading,
    isError,
    error,
  } = useInventories({
    page: currentPage,
    limit: itemsPerPage,
    enabled: status === "authenticated",
  });

  // 3. Extract the inventories array and pagination details from the response
  const inventories = paginatedData?.data;
  const pagination = paginatedData?.pagination;

  const createInventoryMutation = useCreateInventory();
  const deleteInventoryMutation = useDeleteInventory();

  const [newInventoryName, setNewInventoryName] = useState<string>("");

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryName.trim()) {
      alert("Inventory name cannot be empty.");
      return;
    }
    try {
      const newInventory = await createInventoryMutation.mutateAsync({
        name: newInventoryName.trim(),
        status: "draft",
        settings: {},
      });
      setNewInventoryName("");
      router.push(`/inventories/${newInventory.id}`);
    } catch (err) {
      console.error("Error creating inventory:", err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleDeleteInventory = async (
    inventoryId: string,
    inventoryName: string
  ) => {
    if (window.confirm(`Delete "${inventoryName}"?`)) {
      try {
        await deleteInventoryMutation.mutateAsync(inventoryId);
      } catch (err) {
        console.error("Error deleting inventory:", err);
        alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  const isLoading = status === "loading" || isInventoriesLoading;

  return (
    <div className='min-h-screen bg-background-base p-4'>
      <header className='flex justify-center items-center mb-8 max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold text-text-base'>Your Inventories</h1>
      </header>

      <main className='max-w-4xl mx-auto'>
        {status === "authenticated" && (
          <div className='bg-background-surface p-6 rounded-lg shadow-md mb-8'>
            <h2 className='text-2xl font-semibold mb-4 text-text-base'>
              Start a New Inventory
            </h2>
            <form onSubmit={handleCreateInventory} className='flex gap-4'>
              <input
                type='text'
                placeholder='Enter inventory name'
                value={newInventoryName}
                onChange={(e) => setNewInventoryName(e.target.value)}
                required
                className='flex-grow shadow appearance-none border border-border-base rounded w-full py-2 px-3 text-text-base focus:outline-none focus:ring-2 focus:ring-primary'
              />
              <button
                type='submit'
                disabled={createInventoryMutation.isPending}
                className='bg-success hover:bg-success/90 text-text-inverse font-bold py-2 px-4 rounded disabled:opacity-50'
              >
                {createInventoryMutation.isPending ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
        )}

        <div className='bg-background-surface p-6 rounded-lg shadow-md'>
          <h2 className='text-2xl font-semibold mb-4 text-text-base'>
            Past Inventories
          </h2>
          {isLoading && <LoadingSpinner />}

          {status === "unauthenticated" && (
            <p className='text-text-muted'>
              Please sign in to view your inventories.
            </p>
          )}

          {isError && (
            <p className='text-error'>
              Error loading inventories: {error?.message}
            </p>
          )}

          {status === "authenticated" &&
            !isLoading &&
            !isError &&
            (!inventories || inventories.length === 0) && ( // Check inventories array
              <p className='text-text-muted'>
                No inventories found. Start a new one above!
              </p>
            )}

          {status === "authenticated" &&
            !isLoading &&
            !isError &&
            inventories &&
            inventories.length > 0 && (
              <>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                  {inventories.map((inventory: Inventory) => (
                    <div
                      key={inventory.id}
                      className='border border-border-base p-4 rounded-lg shadow-sm bg-background-base flex flex-col justify-between'
                    >
                      <div>
                        <h3 className='text-xl font-semibold text-text-base mb-2'>
                          {inventory.name}
                        </h3>
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
                        <button
                          onClick={() =>
                            router.push(`/inventories/${inventory.id}`)
                          }
                          className='flex-grow bg-primary hover:bg-primary/90 text-text-inverse font-bold py-2 px-3 rounded text-sm'
                        >
                          View/Resume
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteInventory(inventory.id, inventory.name)
                          }
                          disabled={deleteInventoryMutation.isPending}
                          className='bg-error hover:bg-error/90 text-text-inverse font-bold py-2 px-3 rounded text-sm disabled:opacity-50'
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Pagination Controls */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={pagination?.totalPages || 1}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  noun='Page'
                />
              </>
            )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
