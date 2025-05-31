// lib/zustand.ts
import { create } from "zustand";
import { Inventory, Item } from "../types"; // Define these types later

interface AppState {
  currentInventory: Inventory | null;
  itemsMasterList: Item[];
  // ... other global states like user settings
  setInventory: (inventory: Inventory | null) => void;
  setItemsMasterList: (items: Item[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentInventory: null,
  itemsMasterList: [],
  setInventory: (inventory) => set({ currentInventory: inventory }),
  setItemsMasterList: (items) => set({ itemsMasterList: items }),
}));
