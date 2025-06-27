import { InventoryItem, Item } from "@/types";
import bcrypt from "bcryptjs";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// FIXED: The property is 'item' (singular) to match the actual data structure.
type CountableItem = InventoryItem & { item: Item };

// Helper for case-insensitive string comparison, treating null/undefined as last.
// This helper is well-written and can remain as is.
const compare = (
  valA: string | null | undefined,
  valB: string | null | undefined
): number => {
  if (valA === valB) return 0; // Handles both being null/undefined or identical
  if (valA === null || valA === undefined) return 1; // a is null/undefined, comes after b
  if (valB === null || valB === undefined) return -1; // b is null/undefined, comes after a
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
    // CHANGED: Access 'item' and added optional chaining (?.) for safety.
    let comparison = compare(a.item?.item_type, b.item?.item_type);
    if (comparison !== 0) return comparison;

    // 2. Secondary Sort: by Brand
    comparison = compare(a.item?.brand, b.item?.brand);
    if (comparison !== 0) return comparison;

    // 3. Tertiary Sort: by Name
    return compare(a.item?.name, b.item?.name);
  });
  return sortableItems;
};

/**
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
    // CHANGED: Access 'item' and added optional chaining (?.) for safety.
    const comparison = compare(a.item?.item_type, b.item?.item_type);
    if (comparison !== 0) return comparison;

    // 2. Secondary (tie-breaker) Sort: by Name
    return compare(a.item?.name, b.item?.name);
  });
  return sortableItems;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function saltAndHashPassword(password: string) {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
}
