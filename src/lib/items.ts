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
