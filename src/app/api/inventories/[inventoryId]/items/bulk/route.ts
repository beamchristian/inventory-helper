// File Path: /api/inventories/[inventoryId]/items/bulk/route.ts
// This version uses @ts-expect-error to satisfy ESLint and bypass the build error.

import { NextResponse } from "next/server";
import prisma from "@/lib/db/db";
import { auth } from "@/lib/auth";

/**
 * Handles POST requests to add all available master items to a specific Inventory.
 *
 * @param req - The incoming Next.js request object.
 * @param context - The context object containing route parameters.
 * @returns The response object with a count of items added.
 */

// Corrected type for the context parameters
type RouteContext = {
  params: {
    inventoryId: string;
  };
};

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { inventoryId } = context.params; // Directly access params
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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
      item_id: itemId,
      counted_units: 0,
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
    console.error("Error bulk adding items to inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        message: "Failed to bulk add items to inventory.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
