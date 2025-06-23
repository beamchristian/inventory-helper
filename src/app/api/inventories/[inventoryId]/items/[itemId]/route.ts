// src/app/api/inventories/[inventoryId]/items/[itemId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db/db";
import { auth } from "@/lib/auth";

/**
 * GET handler to fetch a single InventoryItem by its ID,
 * ensuring it belongs to the authenticated user.
 * Crucially, it includes the related master Item data.
 */
export async function GET(
  request: Request,
  { params }: { params: { inventoryId: string; itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    const userId = session.user.id;
    const { itemId } = params;

    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        // Ensure the item ID matches
        id: itemId,
        // And ensure the inventory it belongs to is owned by the current user
        inventory: {
          userId: userId,
        },
      },
      // THIS IS THE MOST IMPORTANT PART: It attaches the master 'Item' details.
      include: {
        item: true,
      },
    });

    if (!inventoryItem) {
      // Return 404 if the item doesn't exist or doesn't belong to the user
      return NextResponse.json(
        { message: "Inventory item not found or you do not have permission." },
        { status: 404 }
      );
    }

    return NextResponse.json(inventoryItem);
  } catch (error) {
    console.error("Failed to fetch inventory item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to fetch item", error: errorMessage },
      { status: 500 }
    );
  }
}

// You can also add PATCH and DELETE handlers here later if needed
// to update or delete a single inventory item.
