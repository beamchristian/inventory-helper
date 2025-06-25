// src/app/api/inventories/[inventoryId]/items/[itemId]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/auth";

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
    const Params = await params;
    const { itemId } = Params;

    const inventoryItem = await db.inventoryItem.findFirst({
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
// --- 👇 ADD THIS ENTIRE PATCH FUNCTION 👇 ---

/**
 * PATCH handler to update an InventoryItem (e.g., its counted_units).
 */
export async function PATCH(
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
    const Params = await params;
    const { itemId } = Params;
    const body = await request.json();

    // The data to update, likely just the count
    const { counted_units } = body;

    if (typeof counted_units !== "number") {
      return NextResponse.json(
        { message: "Invalid 'counted_units' value provided." },
        { status: 400 }
      );
    }

    // Use a single 'update' call. Prisma will fail if the where clause doesn't find
    // a matching record (i.e., wrong ID or inventory not owned by the user).
    // This is more efficient and secure than fetching first.
    const updatedInventoryItem = await db.inventoryItem.update({
      where: {
        id: itemId,
        // Enforce ownership by checking the relation
        inventory: {
          userId: userId,
        },
      },
      data: {
        counted_units: counted_units,
      },
    });

    return NextResponse.json(updatedInventoryItem);
  } catch (error: unknown) {
    console.error("Failed to update inventory item:", error);
    // Handle Prisma's "Record Not Found" error which also covers the authorization check
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Item to update not found or you do not have permission." },
        { status: 404 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to update item", error: errorMessage },
      { status: 500 }
    );
  }
}
