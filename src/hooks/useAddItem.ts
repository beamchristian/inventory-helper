import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Item } from '../types'; // Ensure you have your Item type defined in src/types.ts

// Define the shape of the data needed to create a new item
// Omit 'id', 'created_at', and 'user_id' as they are generated/provided by the hook
type NewItemData = Omit<Item, 'id' | 'created_at' | 'user_id'>;

export const useAddItem = () => {
  const queryClient = useQueryClient();

  return useMutation<Item, Error, NewItemData, unknown>({
    mutationFn: async (newItem: NewItemData) => {
      // Get the authenticated user's ID for Row Level Security (RLS)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated. Please log in to add items.');
      }

      // Prepare data for insertion:
      // - Include user_id
      // - Ensure average_weight_per_unit is null if unit_type is 'quantity'
      const dataToInsert = {
        ...newItem,
        user_id: user.id,
        average_weight_per_unit: newItem.unit_type === 'quantity'
          ? null // Set to null if quantity type
          : newItem.average_weight_per_unit,
      };

      const { data, error } = await supabase
        .from('items')
        .insert(dataToInsert)
        .select() // Select the newly inserted row to return its full data
        .single(); // Expecting a single row back

      if (error) {
        console.error('Supabase error adding item:', error.message);
        throw new Error(`Failed to add item: ${error.message}`);
      }
      if (!data) {
        throw new Error('Failed to create item: No data returned from Supabase.');
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate the 'items' query key to force a refetch of the master items list
      // This ensures that any page displaying a list of items will update with the new one.
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (error) => {
      console.error('Error in useAddItem mutation:', error);
    }
  });
};