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
export async function PATCH(
  request: Request,
  // FIXED: Removed explicit type annotation to allow for Promise<params>
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

    const { counted_units } = body;

    if (typeof counted_units !== "number") {
      return NextResponse.json(
        { message: "Invalid 'counted_units' value provided." },
        { status: 400 }
      );
    }

    const updatedInventoryItem = await db.inventoryItem.update({
      where: {
        id: itemId,
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
