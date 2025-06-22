// src/hooks/useItems.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react"; // Import useSession for user ID
import { Item } from "@/types"; // Adjust path if necessary

// Helper to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }
  return response.json();
};

/**
 * useItems Hook
 * Fetches all items belonging to the authenticated user.
 */
export const useItems = () => {
  const { data: session, status } = useSession(); // Get session to access user ID

  return useQuery<Item[]>({
    queryKey: ["items", session?.user?.id], // Include userId in queryKey for re-fetching on login/logout
    queryFn: async () => {
      // Only fetch if authenticated
      if (status !== "authenticated") {
        throw new Error("Authentication required to fetch items.");
      }

      const response = await fetch("/api/items"); // Calls your new /api/items GET route
      return handleApiResponse(response);
    },
    // Enable query only when authenticated
    enabled: status === "authenticated",
  });
};

/**
 * useAddItem Hook
 * Adds a new item for the authenticated user.
 */
export const useAddItem = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession(); // Get session for user ID

  return useMutation<
    Item,
    Error,
    Omit<Item, "id" | "created_at" | "updated_at" | "user_id">
  >({
    mutationFn: async (newItemData) => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated.");
      }

      // Merge user_id with newItemData
      const itemWithUserId = { ...newItemData, user_id: session.user.id };

      const response = await fetch("/api/items", {
        // Calls your new /api/items POST route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemWithUserId),
      });
      return handleApiResponse(response);
    },
    onSuccess: () => {
      // Invalidate the 'items' query to refetch the list after a new item is added
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};

/**
 * useUpdateItem Hook
 * Updates an existing item for the authenticated user.
 */
export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation<Item, Error, Item>({
    // Expects the full Item object to update
    mutationFn: async (updatedItemData) => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated.");
      }
      if (!updatedItemData.id) {
        throw new Error("Item ID is required for update.");
      }

      const response = await fetch(`/api/items/${updatedItemData.id}`, {
        // Calls /api/items/[itemId] PATCH route
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItemData),
      });
      return handleApiResponse(response);
    },
    onSuccess: (data) => {
      // Update the cache for the specific item, and invalidate the list
      queryClient.invalidateQueries({ queryKey: ["items"] });
      // Optionally, you can update the specific item in the cache if you need
      // queryClient.setQueryData(["items", data.id], data);
    },
  });
};

/**
 * useDeleteItem Hook
 * Deletes an item for the authenticated user.
 */
export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation<void, Error, string>({
    // Expects item ID as a string
    mutationFn: async (itemId) => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated.");
      }

      const response = await fetch(`/api/items/${itemId}`, {
        // Calls /api/items/[itemId] DELETE route
        method: "DELETE",
      });
      return handleApiResponse(response); // Response might be empty or a message
    },
    onSuccess: () => {
      // Invalidate the 'items' query to refetch the list after deletion
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};
