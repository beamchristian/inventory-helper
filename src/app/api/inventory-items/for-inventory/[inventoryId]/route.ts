// src/app/api/inventory-items/for-inventory/[inventoryId]/route.ts
// This API route handles fetching all InventoryItems for a specific Inventory,
// and ensures they belong to the authenticated user.

import { NextResponse } from "next/server";
import { db } from "@/lib/db/db"; // Your Prisma client instance
import { auth } from "@/auth"; // Your NextAuth.js server-side auth helper

// Helper to get userId securely on the server
async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Authentication required.");
  }
  return session.user.id;
}

// GET handler to fetch all InventoryItems for a given inventoryId
export async function GET(
  request: Request,
  { params }: { params: { inventoryId: string } }
) {
  try {
    const userId = await getUserIdFromSession(); // Authenticate and get user ID
    const Params = await params;
    const inventoryId = Params.inventoryId;

    if (!inventoryId) {
      return NextResponse.json(
        { message: "Inventory ID is required." },
        { status: 400 }
      );
    }

    // First, verify that the inventory itself belongs to the user
    const inventory = await db.inventory.findUnique({
      where: { id: inventoryId },
      select: { userId: true }, // Only select userId for authorization check
    });

    if (!inventory) {
      return NextResponse.json(
        { message: "Inventory not found." },
        { status: 404 }
      );
    }

    if (inventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized access to this inventory." },
        { status: 403 }
      );
    }

    // Fetch all InventoryItems related to this inventory,
    // and include their associated Item details.
    const inventoryItems = await db.inventoryItem.findMany({
      where: {
        inventory_id: inventoryId,
      },
      include: {
        item: true, // Include the related Item data (singular 'item')
      },
      orderBy: {
        created_at: "asc", // Or whatever default order you prefer
      },
    });

    // CRITICAL: We should return the data as Prisma gives it, with `item` (singular).
    // Your client-side `CombinedInventoryItem` type (`InventoryItem & { item: Item }`)
    // is already set up for this. No need to transform `item` to `items` here.
    return NextResponse.json(inventoryItems);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error fetching inventory items for inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch inventory items." },
      { status: 500 }
    );
  }
}

// You might also add POST, PATCH, DELETE handlers for creating/updating/deleting
// InventoryItems specific to this inventory in this file.
