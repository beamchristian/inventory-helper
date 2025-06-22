// src/app/api/items/[itemId]/route.ts
// This API route handles GET, PATCH, and DELETE operations for a single Item.

import { NextResponse } from "next/server";
import prisma from "@/lib/db/db"; // Your Prisma client instance
import { auth } from "@/lib/auth"; // Your NextAuth.js server-side auth helper

// Helper to get userId securely on the server
async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Authentication required.");
  }
  return session.user.id;
}

// GET handler to fetch a single Item by ID
export async function GET(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const itemId = params.itemId;

    const item = await prisma.item.findUnique({
      where: {
        id: itemId,
      },
    });

    if (!item) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    // Crucial: Ensure the item belongs to the authenticated user
    if (item.user_id !== userId) {
      return NextResponse.json(
        { message: "Unauthorized access to this item." },
        { status: 403 }
      );
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error fetching single item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch item details." },
      { status: 500 }
    );
  }
}

// PATCH handler to update a single Item by ID
export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const itemId = params.itemId;
    const body = await request.json(); // Data to update

    // Ensure the item belongs to the authenticated user before updating
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { message: "Item not found for update." },
        { status: 404 }
      );
    }

    if (existingItem.user_id !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this item." },
        { status: 403 }
      );
    }

    const updatedItem = await prisma.item.update({
      where: {
        id: itemId,
        user_id: userId, // Add userId to where clause for extra security
      },
      data: body, // Apply updates from the request body
    });

    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error updating item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    // Handle Prisma specific errors or general errors
    // Check if error is an object and has a 'code' property, and then check 'code'
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      // Record to update not found
      return NextResponse.json(
        { message: "Item not found or you do not have permission to update." },
        { status: 404 }
      );
    }
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to update item." },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a single Item by ID
export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const itemId = params.itemId;

    // Ensure the item belongs to the authenticated user before deleting
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { message: "Item not found for deletion." },
        { status: 404 }
      );
    }

    if (existingItem.user_id !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this item." },
        { status: 403 }
      );
    }

    await prisma.item.delete({
      where: {
        id: itemId,
        user_id: userId, // Add userId to where clause for extra security
      },
    });

    return NextResponse.json(
      { message: "Item deleted successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error deleting item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    // Check if error is an object and has a 'code' property, and then check 'code'
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      // Record to delete not found
      return NextResponse.json(
        { message: "Item not found or you do not have permission to delete." },
        { status: 404 }
      );
    }
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to delete item." },
      { status: 500 }
    );
  }
}
