import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";

/**
 * GET handler to fetch a single InventoryItem by its ID,
 * ensuring it belongs to the authenticated user.
 * Crucially, it includes the related master Item data.
 */
export async function GET(
  request: Request,
  context: {
    params: Promise<{ inventoryId: string; itemId: string }>;
  }
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
    const itemId = (await context.params).itemId;

    const inventoryItem = await db.inventoryItem.findFirst({
      where: {
        id: itemId,
        inventory: {
          userId: userId,
        },
      },
      include: {
        item: true,
      },
    });

    if (!inventoryItem) {
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

/**
 * PATCH handler to update an InventoryItem (e.g., its counted_units).
 */
// In /api/inventories/[inventoryId]/items/[itemId]/route.ts

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ inventoryId: string; itemId: string }>;
  }
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
    const itemId = (await context.params).itemId;
    const body = await request.json();

    // 1. Destructure both possible fields from the request body
    const { counted_units, is_entered } = body;

    // 2. Create a payload object to hold only the valid data we receive
    const updatePayload: { counted_units?: number; is_entered?: boolean } = {};

    // 3. Validate and add each field to the payload if it exists
    if (counted_units !== undefined) {
      if (typeof counted_units !== "number" || counted_units < 0) {
        return NextResponse.json(
          { message: "Invalid 'counted_units' value provided." },
          { status: 400 }
        );
      }
      updatePayload.counted_units = counted_units;
    }

    if (is_entered !== undefined) {
      if (typeof is_entered !== "boolean") {
        return NextResponse.json(
          { message: "Invalid 'is_entered' value provided." },
          { status: 400 }
        );
      }
      updatePayload.is_entered = is_entered;
    }

    // Check if any valid data was actually sent
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update were provided." },
        { status: 400 }
      );
    }

    // 4. Use the dynamically built payload in the update query
    const updatedInventoryItem = await db.inventoryItem.update({
      where: {
        id: itemId,
        // Ensure the user owns the inventory this item belongs to
        inventory: {
          userId: userId,
        },
      },
      data: updatePayload,
    });

    return NextResponse.json(updatedInventoryItem);
  } catch (error: unknown) {
    console.error("Failed to update inventory item:", error);
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
