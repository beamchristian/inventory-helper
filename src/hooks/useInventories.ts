// src/hooks/useInventories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Inventory, UpdateInventoryArgs } from '../types'; // Adjust path
import { useEffect, useState } from 'react'; // For useAuthUserId

// Re-use the useAuthUserId hook from useItems.ts or create a shared auth hook
const useAuthUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser(); // Also capture error here
      if (error) {
          console.error("Error fetching user in useAuthUserId:", error); // <-- ADD THIS
      }
      setUserId(user?.id || null);
    };
    fetchUser();
    // ... rest of the hook
  }, []);
  return userId;
};

// Fetch all inventories for the logged-in user
export const useInventories = () => {
  const userId = useAuthUserId();
  console.log("useInventories: current userId:", userId); // <-- ADD THIS
  return useQuery<Inventory[]>({
    queryKey: ['inventories', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }); // Show newest first
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId,
  });
};

// Create a new inventory
export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId();
  return useMutation({
    mutationFn: async (newInventory: { name: string; settings?: Record<string, any> }) => {
      if (!userId) throw new Error('User not authenticated.');
      const inventoryToInsert = { ...newInventory, user_id: userId };
      const { data, error } = await supabase.from('inventories').insert(inventoryToInsert).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories', userId] });
    },
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<Inventory, Error, UpdateInventoryArgs>({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('inventories')
        .update({ status: status, completed_at: status === 'completed' ? new Date().toISOString() : null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch the updated inventory list/details
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.id] });
      console.log(`Inventory ${data.name} status updated to ${data.status}`);
    },
    onError: (error) => {
      console.error('Error updating inventory status:', error.message);
    },
  });
};

// Delete an inventory
export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  const userId = useAuthUserId();
  return useMutation({
    mutationFn: async (inventoryId: string) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('inventories')
        .delete()
        .eq('id', inventoryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories', userId] });
    },
  });
};