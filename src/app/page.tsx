// src/app/page.tsx
"use client";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import {
  useInventories,
  useCreateInventory,
  useDeleteInventory,
} from "../hooks/useInventories"; // Adjust path
import { useEffect, useState } from "react";
import { Inventory } from "../types"; // Adjust path

// Re-use the useAuthUserId hook here or create a shared auth context/hook
const useAuthUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null);
      }
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  return userId;
};

const LoadingSpinner = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500'></div>
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const userId = useAuthUserId();
  const { data: inventories, isLoading, isError, error } = useInventories();
  const createInventoryMutation = useCreateInventory();
  const deleteInventoryMutation = useDeleteInventory();

  const [newInventoryName, setNewInventoryName] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryName.trim()) {
      alert("Inventory name cannot be empty.");
      return;
    }
    try {
      const newInventory = await createInventoryMutation.mutateAsync({
        name: newInventoryName.trim(),
      });
      setNewInventoryName(""); // Clear form
      alert(`Inventory "${newInventory.name}" created successfully!`);
      router.push(`/inventories/${newInventory.id}`); // Optionally redirect to new inventory
    } catch (err) {
      alert(
        `Error creating inventory: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleDeleteInventory = async (
    inventoryId: string,
    inventoryName: string
  ) => {
    if (
      confirm(
        `Are you sure you want to delete inventory "${inventoryName}"? This cannot be undone.`
      )
    ) {
      try {
        await deleteInventoryMutation.mutateAsync(inventoryId);
        alert(`Inventory "${inventoryName}" deleted.`);
      } catch (err) {
        alert(
          `Error deleting inventory: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }
  };

  if (!userId) {
    return <LoadingSpinner />; // Show loading while user ID is being fetched
  }

  return (
    <div className='min-h-screen bg-gray-100 p-4'>
      <header className='flex justify-between items-center mb-8 max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold text-gray-800'>Your Inventories</h1>
        <button
          onClick={handleSignOut}
          className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded shadow-md'
        >
          Sign Out
        </button>
      </header>

      <main className='max-w-4xl mx-auto'>
        {/* Create New Inventory Form */}
        <div className='bg-white p-6 rounded-lg shadow-md mb-8'>
          <h2 className='text-2xl font-semibold mb-4'>Start a New Inventory</h2>
          <form onSubmit={handleCreateInventory} className='flex gap-4'>
            <input
              type='text'
              placeholder="Enter inventory name (e.g., 'Weekly Count - May 27')"
              value={newInventoryName}
              onChange={(e) => setNewInventoryName(e.target.value)}
              required
              className='flex-grow shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            />
            <button
              type='submit'
              disabled={createInventoryMutation.isPending}
              className='bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
            >
              {createInventoryMutation.isPending
                ? "Creating..."
                : "Create Inventory"}
            </button>
          </form>
        </div>

        {/* Inventory List */}
        <div className='bg-white p-6 rounded-lg shadow-md'>
          <h2 className='text-2xl font-semibold mb-4'>Past Inventories</h2>
          {isLoading && <LoadingSpinner />}
          {isError && (
            <p className='text-red-500'>
              Error loading inventories: {error?.message}
            </p>
          )}
          {!isLoading &&
            !isError &&
            inventories &&
            inventories.length === 0 && (
              <p className='text-gray-600'>
                No inventories found. Start a new one above!
              </p>
            )}
          {!isLoading && !isError && inventories && inventories.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {inventories.map((inventory: Inventory) => (
                <div
                  key={inventory.id}
                  className='border p-4 rounded-lg shadow-sm bg-gray-50 flex flex-col justify-between'
                >
                  <div>
                    <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                      {inventory.name}
                    </h3>
                    <p className='text-sm text-gray-600'>
                      Status:{" "}
                      <span className='capitalize font-medium'>
                        {inventory.status}
                      </span>
                    </p>
                    <p className='text-sm text-gray-600 mb-4'>
                      Created:{" "}
                      {new Date(inventory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className='flex space-x-2 mt-4'>
                    <button
                      onClick={() =>
                        router.push(`/inventories/${inventory.id}`)
                      }
                      className='flex-grow bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-sm'
                    >
                      View/Resume
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteInventory(inventory.id, inventory.name)
                      }
                      disabled={deleteInventoryMutation.isPending}
                      className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded text-sm'
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
}
