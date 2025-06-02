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
    {/* Using primary color for spinner border */}
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
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
    // Use background-base for the main page background
    <div className='min-h-screen bg-background-base p-4'>
      <header className='flex justify-between items-center mb-8 max-w-4xl mx-auto'>
        {/* Use text-base for heading text */}
        <h1 className='text-4xl font-bold text-text-base'>Your Inventories</h1>
        {/* Use error color for sign-out button */}
        <button
          onClick={handleSignOut}
          className='bg-error hover:bg-error/90 text-text-inverse font-bold py-2 px-4 rounded shadow-md transition-colors'
        >
          Sign Out
        </button>
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
}
