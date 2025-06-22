// src/app/api/inventories/[inventoryId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db/db";
import { auth } from "@/lib/auth";

async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("User not authenticated.");
  }
  return session.user.id;
}

// GET (Optional, if you need to fetch a single inventory by ID)
export async function GET(
  request: Request,
  { params }: { params: { inventoryId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const inventoryId = params.inventoryId;

    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      return NextResponse.json(
        { message: "Inventory not found." },
        { status: 404 }
      );
    }

    if (inventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized access to inventory." },
        { status: 403 }
      );
    }

    return NextResponse.json(inventory);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error fetching single inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch inventory." },
      { status: 500 }
    );
  }
}

// PATCH to update an existing inventory
export async function PATCH(
  request: Request,
  { params }: { params: { inventoryId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const inventoryId = params.inventoryId;
    const body = await request.json();

    const existingInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!existingInventory) {
      return NextResponse.json(
        { message: "Inventory not found." },
        { status: 404 }
      );
    }

    if (existingInventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this inventory." },
        { status: 403 }
      );
    }

    const updatedInventory = await prisma.inventory.update({
      where: {
        id: inventoryId,
        userId: userId,
      },
      data: body,
    });

    return NextResponse.json(updatedInventory);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error updating inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      // Specific Prisma error check
      return NextResponse.json(
        { message: "Inventory not found or you do not have permission." },
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
      { message: errorMessage || "Failed to update inventory." },
      { status: 500 }
    );
  }
}

// DELETE an inventory
export async function DELETE(
  request: Request,
  { params }: { params: { inventoryId: string } }
) {
  try {
    const userId = await getUserIdFromSession();
    const inventoryId = params.inventoryId;

    const existingInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!existingInventory) {
      return NextResponse.json(
        { message: "Inventory not found." },
        { status: 404 }
      );
    }

    if (existingInventory.userId !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You do not own this inventory." },
        { status: 403 }
      );
    }

    await prisma.inventory.delete({
      where: {
        id: inventoryId,
        userId: userId,
      },
    });

    return NextResponse.json(
      { message: "Inventory deleted successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error deleting inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      // Specific Prisma error check
      return NextResponse.json(
        { message: "Inventory not found or you do not have permission." },
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
      { message: errorMessage || "Failed to delete inventory." },
      { status: 500 }
    );
  }
}
