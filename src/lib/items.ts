// src/lib/items.ts
// Server-side helpers that keep a user's master item list free of duplicates.
// Every item must have a UPC, and a UPC is unique per user.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/db";

/**
 * Normalizes a UPC so the same code always compares equal: trims it and
 * removes spaces and dashes. Returns null for empty values.
 */
export function normalizeUpc(upc: unknown): string | null {
  if (typeof upc !== "string") return null;
  const cleaned = upc.trim().replace(/[\s-]+/g, "");
  return cleaned === "" ? null : cleaned;
}

export const UPC_REQUIRED_MESSAGE = "A UPC is required for every item.";

export const CASE_QUANTITY_MESSAGE =
  "Case quantity must be a whole number of at least 1, or left empty.";

/**
 * Parses the optional units-per-case value. Empty values mean "no case
 * quantity" (null); anything else must be a whole number of at least 1.
 * Returns undefined when the value is invalid.
 */
export function parseCaseQuantity(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isInteger(num) || num < 1) {
    return undefined;
  }
  return num;
}

/** Finds another of the user's items that already uses this UPC. */
export async function findDuplicateItem(
  userId: string,
  upc: string,
  excludeId?: string,
) {
  return db.item.findFirst({
    where: {
      user_id: userId,
      upc_number: upc,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true, name: true, upc_number: true },
  });
}

/** Message shown to the user when an item would be a duplicate. */
export function duplicateItemMessage(existing: {
  name: string;
  upc_number: string;
}) {
  return `An item with UPC ${existing.upc_number} already exists ("${existing.name}").`;
}

/** True when Prisma rejected a write because of a unique constraint. */
export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
