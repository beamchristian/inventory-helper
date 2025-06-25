// src/app/api/inventory-items/[inventoryItemId]/route.ts
// This file will handle GET, PATCH, and DELETE for a single InventoryItem

import { NextResponse } from "next/server";
import { db } from "@/lib/db/db"; // Your Prisma client instance
import { auth } from "@/auth";

// Helper to get userId securely on the server
async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("User not authenticated.");
  }
  return session.user.id;
}

// GET handler for a single InventoryItem
export async function GET(
  request: Request,
  { params }: { params: { inventoryItemId: string } }
) {
  const Params = await params;
  try {
    const userId = await getUserIdFromSession(); // Authenticate and get user ID
    const inventoryItemId = Params.inventoryItemId;

    const inventoryItem = await db.inventoryItem.findUnique({
      where: {
        id: inventoryItemId,
      },
      include: {
        item: true, // Include the related Item data (singular 'item')
        inventory: true, // Include the related Inventory to check userId
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { message: "Inventory item not found." },
        { status: 404 }
      );
    }

    // Crucial: Ensure the inventory item belongs to an inventory owned by the authenticated user
    if (inventoryItem.inventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized access to inventory item." },
        { status: 403 }
      );
    }

    // Return the inventoryItem directly. The client's CombinedInventoryItem type expects 'item' (singular).
    // No transformation from 'item' to 'items' is needed here.
    return NextResponse.json(inventoryItem);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error fetching single inventory item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch inventory item details." },
      { status: 500 }
    );
  }
}

// PATCH to update an existing InventoryItem
export async function PATCH(
  request: Request,
  { params }: { params: { inventoryItemId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const Params = await params;
    const inventoryItemId = Params.inventoryItemId;
    const body = await request.json(); // Expected: { counted_units?: number, calculated_weight?: number }

    // Find the inventoryItem and its associated inventory to ensure ownership
    const existingInventoryItem = await db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { inventory: true },
    });

    if (!existingInventoryItem) {
      return NextResponse.json(
        { message: "Inventory item not found." },
        { status: 404 }
      );
    }

    if (existingInventoryItem.inventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this inventory item." },
        { status: 403 }
      );
    }

    const updatedInventoryItem = await db.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        counted_units: body.counted_units,
        // calculated_weight: body.calculated_weight, // Only include if it's explicitly part of the update payload
        updated_at: new Date(),
      },
      include: {
        // Include item to return the full CombinedInventoryItem type
        item: true,
      },
    });

    // Return the updatedInventoryItem directly.
    // The client's CombinedInventoryItem type expects 'item' (singular).
    return NextResponse.json(updatedInventoryItem);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error updating inventory item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to update inventory item." },
      { status: 500 }
    );
  }
}

// DELETE an InventoryItem
export async function DELETE(
  request: Request,
  { params }: { params: { inventoryItemId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const Params = await params;
    const inventoryItemId = Params.inventoryItemId;

    const existingInventoryItem = await db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { inventory: true }, // Include inventory to check ownership
    });

    if (!existingInventoryItem) {
      return NextResponse.json(
        { message: "Inventory item not found." },
        { status: 404 }
      );
    }

    if (existingInventoryItem.inventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this inventory item." },
        { status: 403 }
      );
    }

    await db.inventoryItem.delete({
      where: {
        id: inventoryItemId,
      },
    });

    return NextResponse.json(
      { message: "Inventory item deleted successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error deleting inventory item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to delete inventory item." },
      { status: 500 }
    );
  }
}
