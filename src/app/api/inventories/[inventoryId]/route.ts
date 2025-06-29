// src/app/api/inventories/[inventoryId]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";

// REFACTORED: Centralized error handler for this resource.
function handleError(error: unknown): NextResponse {
  console.error("API Error:", error);
  if (error instanceof Error) {
    if (error.message.includes("Authentication required")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
  }
  // Handle Prisma's "Record Not Found" error
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2025"
  ) {
    return NextResponse.json(
      { message: "Inventory not found or you do not have permission." },
      { status: 404 }
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred.";
  return NextResponse.json(
    { message: "An internal error occurred.", error: errorMessage },
    { status: 500 }
  );
}

// GET handler
export async function GET(
  request: Request,
  context: {
    params: Promise<{ inventoryId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const inventoryId = (await context.params).inventoryId;
    // REFACTORED: Single query for secure fetching.
    const inventory = await db.inventory.findUnique({
      where: {
        id: inventoryId,
        userId: userId, // Enforce ownership
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { message: "Inventory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(inventory);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH handler
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ inventoryId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const body = await request.json();
    const inventoryId = (await context.params).inventoryId;
    // REFACTORED: Atomic update operation.
    const updatedInventory = await db.inventory.update({
      where: {
        id: inventoryId,
        userId: userId, // Enforce ownership
      },
      data: body,
    });

    return NextResponse.json(updatedInventory);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE handler
export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ inventoryId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const inventoryId = (await context.params).inventoryId;
    // REFACTORED: Atomic delete operation.
    await db.inventory.delete({
      where: {
        id: inventoryId,
        userId: userId, // Enforce ownership
      },
    });

    return NextResponse.json(
      { message: "Inventory deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
