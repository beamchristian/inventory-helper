// src/hooks/useItems.ts
"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Item } from '../types'; // Make sure this path is correct
import { useEffect, useState } from 'react';

// Custom hook to get the current authenticated user's ID
// You might want to move this to a more general 'useAuth' hook later
const useAuthUserId = () => {
  const [userId, setUserId] = useState<string | null>(null); // Add useState
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
    // Listen for auth changes to update user ID if necessary
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  return userId;
};


// Fetch all items for the logged-in user
export const useItems = () => {
  const userId = useAuthUserId(); // Get current user's ID
  return useQuery<Item[]>({
    queryKey: ['items', userId], // Query key now includes userId
    queryFn: async () => {
      if (!userId) {
        // If no user ID, return empty array (or throw an error if items are strictly per user)
        return [];
      }
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId) // Filter by user_id
        .order('name', { ascending: true }); // Order alphabetically by name
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId, // Only run query if userId is available
  });
};

// Add a new item
export const useAddItem = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId(); // Get current user's ID
  return useMutation({
    mutationFn: async (newItem: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      if (!userId) throw new Error('User not authenticated.');
      const itemToInsert = { ...newItem, user_id: userId };
      const { data, error } = await supabase.from('items').insert(itemToInsert).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] }); // Invalidate and refetch items for the user
    },
  });
};

// Update an existing item
export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId(); // Get current user's ID
  return useMutation({
    mutationFn: async (updatedItem: Partial<Item> & { id: string }) => {
      if (!userId) throw new Error('User not authenticated.');
      // Ensure user_id is implicit via RLS, or explicitly passed if your RLS needs it
      const { data, error } = await supabase
        .from('items')
        .update(updatedItem) // Supabase RLS will ensure only owner can update
        .eq('id', updatedItem.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] });
    },
  });
};

// Delete an item
export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId(); // Get current user's ID
  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId); // Supabase RLS will ensure only owner can delete
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] });
    },
  });
};