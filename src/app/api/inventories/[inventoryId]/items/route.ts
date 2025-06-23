// src/app/api/inventories/[inventoryId]/items/route.ts
// This API route handles adding (POST), fetching (GET), and deleting (DELETE)
// *existing* master items to a *specific* inventory.
// It manages InventoryItem records, not new master Items.

import { NextResponse } from "next/server";
import prisma from "@/lib/db/db"; // Import the shared prisma client instance
import { auth } from "@/lib/auth"; // Import your custom auth helper

/**
 * Handles GET requests to fetch all InventoryItems for a specific Inventory.
 *
 * @param {Request} req - The incoming request object.
 * @param {object} context - The context containing route parameters.
 * @param {object} context.params - Next.js dynamic route parameters.
 * @param {string} context.params.inventoryId - The ID of the inventory to fetch items from.
 * @returns {Promise<NextResponse>} The response object with a list of InventoryItems.
 */
export async function GET(
  req: Request,
  { params }: { params: { inventoryId: string } }
): Promise<NextResponse> {
  try {
    const session = await auth(); // Get the server-side session

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { inventoryId } = params;

    if (!inventoryId) {
      return NextResponse.json(
        { message: "Inventory ID is required." },
        { status: 400 }
      );
    }

    // Verify the inventory exists and belongs to the user
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

    // Fetch all InventoryItems for this inventory, including their associated Master Item details
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        inventory_id: inventoryId,
      },
      include: {
        item: true, // Include the related master item details
      },
      orderBy: {
        created_at: "asc", // Example: sort by when they were added to the inventory
      },
    });

    return NextResponse.json(inventoryItems, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching inventory items:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Failed to fetch inventory items.", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handles POST requests to add an existing Item to a specific Inventory.
 * This creates a new InventoryItem record.
 *
 * @param {Request} req - The incoming request object.
 * @param {object} context - The context containing route parameters.
 * @param {object} context.params - Next.js dynamic route parameters.
 * @param {string} context.params.inventoryId - The ID of the inventory to add the item to.
 * @returns {Promise<NextResponse>} The response object.
 */
export async function POST(
  req: Request,
  { params }: { params: { inventoryId: string } }
): Promise<NextResponse> {
  try {
    const session = await auth(); // Get the server-side session

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { inventoryId } = params;
    const { item_id, counted_units } = await req.json();

    // Basic validation
    if (!inventoryId || !item_id) {
      return NextResponse.json(
        { message: "Inventory ID and Item ID are required." },
        { status: 400 }
      );
    }

    // Use findFirst to query by multiple non-unique fields like id and userId
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

    // Check if the item already exists in this inventory
    const existingInventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        inventory_id: inventoryId,
        item_id: item_id,
      },
    });

    if (existingInventoryItem) {
      return NextResponse.json(
        { message: "Item already exists in this inventory." },
        { status: 409 } // 409 Conflict
      );
    }

    // Create the new InventoryItem record
    const newInventoryItem = await prisma.inventoryItem.create({
      data: {
        inventory_id: inventoryId,
        item_id: item_id,
        counted_units: counted_units || 0, // Ensure counted_units defaults to 0
      },
      include: {
        item: true, // Include the related master item for the frontend
      },
    });

    return NextResponse.json(newInventoryItem, { status: 201 });
  } catch (error: unknown) {
    console.error("Error adding item to inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        message: "Failed to add item to inventory",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Handles DELETE requests to remove an item from a specific Inventory.
 *
 * @param {Request} req - The incoming request object.
 * @param {object} context - The context containing route parameters.
 * @param {object} context.params - Next.js dynamic route parameters.
 * @param {string} context.params.inventoryId - The ID of the inventory the item belongs to.
 * @returns {Promise<NextResponse>} The response object.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { inventoryId: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { inventoryId } = params;
    const { inventoryItemId } = await req.json(); // Expected from the client

    if (!inventoryId || !inventoryItemId) {
      return NextResponse.json(
        {
          message:
            "Inventory ID and Inventory Item ID are required for deletion.",
        },
        { status: 400 }
      );
    }

    // Verify ownership of the inventory and the inventory item
    const inventoryItemToDelete = await prisma.inventoryItem.findUnique({
      where: {
        id: inventoryItemId,
        inventory_id: inventoryId, // Ensure it belongs to this specific inventory
      },
      include: {
        inventory: {
          select: {
            userId: true, // Select user ID from the related inventory
          },
        },
      },
    });

    if (!inventoryItemToDelete) {
      return NextResponse.json(
        { message: "Inventory item not found." },
        { status: 404 }
      );
    }

    // Check if the inventory associated with the item belongs to the authenticated user
    if (inventoryItemToDelete.inventory.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized action." },
        { status: 403 }
      );
    }

    await prisma.inventoryItem.delete({
      where: {
        id: inventoryItemId,
      },
    });

    return NextResponse.json(
      { message: "Item successfully removed from inventory." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting inventory item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        message: "Failed to remove item from inventory",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
