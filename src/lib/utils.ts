// src/lib/utils.ts
import { InventoryItem, Item } from "@/types";

type CountableItem = InventoryItem & { items: Item };

// Helper for case-insensitive string comparison, treating null/undefined as last
const compare = (
  valA: string | null | undefined,
  valB: string | null | undefined
): number => {
  if (!valA && !valB) return 0;
  if (!valA) return 1; // a is null/undefined, comes after b
  if (!valB) return -1; // b is null/undefined, comes after a
  return valA.localeCompare(valB);
};

/**
 * Sorts an array of inventory items for the DEFAULT "Count Mode" order.
 * Order: 1. Item Type (asc), 2. Brand (asc), 3. Name (asc)
 * @param items - The array of inventory items to sort.
 * @returns A new, sorted array.
 */
export const sortForCountMode = (items: CountableItem[]): CountableItem[] => {
  const sortableItems = [...items];
  sortableItems.sort((a, b) => {
    // 1. Primary Sort: by Item Type
    let comparison = compare(a.items.item_type, b.items.item_type);
    if (comparison !== 0) return comparison;

    // 2. Secondary Sort: by Brand
    comparison = compare(a.items.brand, b.items.brand);
    if (comparison !== 0) return comparison;

    // 3. Tertiary Sort: by Name
    return compare(a.items.name, b.items.name);
  });
  return sortableItems;
};

/**
 * 👇 NEW FUNCTION ADDED HERE
 * Sorts an array of inventory items by Item Type only.
 * Order: 1. Item Type (asc), 2. Name (asc) as a tie-breaker
 * @param items - The array of inventory items to sort.
 * @returns A new, sorted array.
 */
export const sortForItemTypeOnly = (
  items: CountableItem[]
): CountableItem[] => {
  const sortableItems = [...items];
  sortableItems.sort((a, b) => {
    // 1. Primary Sort: by Item Type
    const comparison = compare(a.items.item_type, b.items.item_type);
    if (comparison !== 0) return comparison;

    // 2. Secondary (tie-breaker) Sort: by Name
    return compare(a.items.name, b.items.name);
  });
  return sortableItems;
};
