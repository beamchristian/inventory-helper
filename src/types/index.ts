export interface Item {
  id: string;
  user_id: string;
  name: string;
  upc_number: string | null;
  average_weight_per_unit: number | null;
  unit_type: "quantity" | "weight";
  item_type: string | null;
  brand: string | null;
  created_at: string;
}

export interface Inventory {
  id: string;
  user_id: string;
  name: string;
  status: "draft" | "completed" | "deleted";
  settings: Record<string, unknown> | null; // JSONB type for settings - Changed 'any' to 'unknown'
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  item_id: string;
  counted_units: number;
  calculated_weight: number | null;
  created_at: string;
  updated_at: string;
  // When fetching with join, you'll get item details:
  items: Item; // Supabase will nest this
}

export interface UpdateInventoryArgs {
  id: string;
  status: "completed" | "active"; // Or whatever your status types are
}
