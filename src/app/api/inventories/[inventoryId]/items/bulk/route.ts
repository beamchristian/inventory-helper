// src/app/api/inventories/[inventoryId]/items/bulk/route.ts
// This API route handles bulk operations for adding items to a specific inventory.

// It's good practice to ensure DOM lib is referenced for Request/Response types in some environments
/// <reference lib="dom" />

import { NextResponse, type NextRequest } from "next/server"; // Import NextRequest for best practice, though Request also works
import prisma from "@/lib/db/db"; // Use your shared prisma client instance
import { auth } from "@/lib/auth"; // Import your custom auth helper

/**
 * Handles POST requests to add all available master items to a specific Inventory.
 *
 * @param {NextRequest} _req - The incoming Next.js request object. (Even if unused, it's needed for type compatibility)
 * @param {object} context - Object containing dynamic route parameters.
 * @param {object} context.params - Dynamic route parameters.
 * @param {string} context.params.inventoryId - The ID of the inventory.
 * @returns {NextResponse} The response object with a count of items added.
 */
export async function POST(
  _req: NextRequest, // Add NextRequest as the first parameter, even if unused. Use _req to signal it's intentionally unused.
  context: { params: { inventoryId: string } } // Standard context typing for dynamic routes
) {
  try {
    const session = await auth(); // Get the server-side session

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { inventoryId } = context.params; // Access from context.params

    if (!inventoryId) {
      return NextResponse.json(
        { message: "Inventory ID is required." },
        { status: 400 }
      );
    }

    // 1. Verify the inventory exists and belongs to the user
    const inventory = await prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        userId: session.user.id,
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { message: "Inventory not found or unauthorized." },
        { status: 404 }
      );
    }

    // 2. Fetch all master items created by this user
    const allUserMasterItems = await prisma.item.findMany({
      where: {
        user_id: session.user.id,
      },
      select: {
        id: true,
      },
    });
    const allUserMasterItemIds = new Set(
      allUserMasterItems.map((item) => item.id)
    );

    // 3. Fetch all items currently in this specific inventory
    const currentInventoryItems = await prisma.inventoryItem.findMany({
      where: {
        inventory_id: inventoryId,
      },
      select: {
        item_id: true,
      },
    });
    const existingInventoryItemIds = new Set(
      currentInventoryItems.map((invItem) => invItem.item_id)
    );

    // 4. Determine which master items are NOT yet in this inventory
    const itemsToAddToInventory = Array.from(allUserMasterItemIds).filter(
      (masterItemId) => !existingInventoryItemIds.has(masterItemId)
    );

    if (itemsToAddToInventory.length === 0) {
      return NextResponse.json(
        {
          message: "All available items are already in this inventory.",
          countAdded: 0,
        },
        { status: 200 }
      );
    }

    // 5. Prepare data for bulk creation
    const dataToCreate = itemsToAddToInventory.map((itemId) => ({
      inventory_id: inventoryId,
      counted_units: 0, // Default to 0 units when adding
      item_id: itemId,
    }));

    // 6. Bulk create new InventoryItem records
    const result = await prisma.inventoryItem.createMany({
      data: dataToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json(
      { message: "Items added successfully.", countAdded: result.count },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error adding all items to inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { message: errorMessage || "Failed to add all items to inventory." },
      { status: 500 }
    );
  }
}
