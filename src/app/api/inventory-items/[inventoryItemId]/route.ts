// src/app/api/inventory-items/[inventoryItemId]/route.ts
// This file will handle GET, PATCH, and DELETE for a single InventoryItem

import { NextResponse } from "next/server";
import prisma from "@/lib/db/db"; // Your Prisma client instance
import { auth } from "@/lib/auth";

// Helper to get userId securely on the server
async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("User not authenticated.");
  }
  return session.user.id;
}

// GET handler for a single InventoryItem (replaces the supabase call in your hook)
export async function GET(
  request: Request,
  { params }: { params: { inventoryItemId: string } }
) {
  try {
    const userId = await getUserIdFromSession(); // Authenticate and get user ID
    const inventoryItemId = params.inventoryItemId;

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: {
        id: inventoryItemId,
      },
      include: {
        item: true, // Include the related Item data
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

    // Supabase's `select(*, items(*))` structure puts the item details directly under `items`.
    // Prisma's `include` puts it under the `item` property.
    // We'll transform the response to match your existing client-side type `InventoryItem & { items: Item }`.
    const formattedInventoryItem = {
      ...inventoryItem,
      items: inventoryItem.item, // Renaming 'item' to 'items' for compatibility
    };
    // Clean up unnecessary nested objects if you don't need them on the client
    delete (formattedInventoryItem as any).item;
    delete (formattedInventoryItem as any).inventory; // Don't expose full inventory object if not needed

    return NextResponse.json(formattedInventoryItem);
  } catch (error: any) {
    console.error("Error fetching single inventory item:", error);
    if (error.message === "User not authenticated.") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: error.message || "Failed to fetch inventory item details." },
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
    const inventoryItemId = params.inventoryItemId;
    const body = await request.json(); // Expected: { counted_units?: number, calculated_weight?: number }

    // Find the inventoryItem and its associated inventory to ensure ownership
    const existingInventoryItem = await prisma.inventoryItem.findUnique({
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

    const updatedInventoryItem = await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        counted_units: body.counted_units,
        calculated_weight: body.calculated_weight, // Ensure this is also updated if your type supports it
        updated_at: new Date(),
      },
    });

    // Re-fetch with item relation to match client expectations
    const finalUpdatedItem = await prisma.inventoryItem.findUnique({
      where: { id: updatedInventoryItem.id },
      include: { item: true, inventory: true },
    });

    const formattedUpdatedItem = {
      ...finalUpdatedItem,
      items: finalUpdatedItem?.item,
    };
    delete (formattedUpdatedItem as any)?.item;
    delete (formattedUpdatedItem as any)?.inventory;

    return NextResponse.json(formattedUpdatedItem);
  } catch (error: any) {
    console.error("Error updating inventory item:", error);
    if (error.message === "User not authenticated.") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: error.message || "Failed to update inventory item." },
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
    const inventoryItemId = params.inventoryItemId;

    const existingInventoryItem = await prisma.inventoryItem.findUnique({
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

    await prisma.inventoryItem.delete({
      where: {
        id: inventoryItemId,
      },
    });

    return NextResponse.json(
      { message: "Inventory item deleted successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    if (error.message === "User not authenticated.") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: error.message || "Failed to delete inventory item." },
      { status: 500 }
    );
  }
}
