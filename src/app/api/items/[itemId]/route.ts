// src/app/api/items/[itemId]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  duplicateItemMessage,
  findDuplicateItem,
  isUniqueConstraintError,
  normalizeUpc,
  UPC_REQUIRED_MESSAGE,
} from "@/lib/items";

// REFACTORED: Centralized error handler to reduce repetition.
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
  // Handle Prisma's "Record Not Found" error for delete/update operations
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2025"
  ) {
    return NextResponse.json(
      { message: "Item not found or you do not have permission." },
      { status: 404 }
    );
  }
  // A concurrent request took the same UPC between our check and the write
  if (isUniqueConstraintError(error)) {
    return NextResponse.json(
      { message: "An item with this UPC already exists." },
      { status: 409 }
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred.";
  return NextResponse.json(
    { message: "An internal error occurred.", error: errorMessage },
    { status: 500 }
  );
}

// GET handler to fetch a single Item by ID
export async function GET(
  request: Request,
  context: {
    params: Promise<{ itemId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const itemId = (await context.params).itemId;

    // REFACTORED: Use a single query to find the item ONLY if it belongs to the user.
    const item = await db.item.findUnique({
      where: {
        id: itemId,
        user_id: userId, // Combine the ownership check into the query
      },
    });

    // If no item is found, it's either non-existent or not owned by the user.
    // Return 404 in both cases for better security.
    if (!item) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH handler to update a single Item by ID
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ itemId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const itemId = (await context.params).itemId;
    const body = await request.json();

    const current = await db.item.findUnique({
      where: { id: itemId, user_id: userId }, // Enforce ownership
    });
    if (!current) {
      return NextResponse.json(
        { message: "Item not found or you do not have permission." },
        { status: 404 }
      );
    }

    // Only these fields may be edited; id, user_id and created_at stay fixed.
    const data: Prisma.ItemUpdateInput = {};
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if ("upc_number" in body) {
      // The UPC can be changed but never removed
      const upc = normalizeUpc(body.upc_number);
      if (!upc) {
        return NextResponse.json(
          { message: UPC_REQUIRED_MESSAGE },
          { status: 400 }
        );
      }
      // Reject a UPC that another of the user's items already uses
      const existing = await findDuplicateItem(userId, upc, itemId);
      if (existing) {
        return NextResponse.json(
          { message: duplicateItemMessage(existing) },
          { status: 409 }
        );
      }
      data.upc_number = upc;
    }
    if ("unit_type" in body) data.unit_type = body.unit_type;
    if ("average_weight_per_unit" in body) {
      data.average_weight_per_unit = body.average_weight_per_unit;
    }
    if ("item_type" in body) data.item_type = body.item_type || null;
    if ("brand" in body) data.brand = body.brand || null;
    if (data.unit_type === "quantity") data.average_weight_per_unit = null;

    const updatedItem = await db.item.update({
      where: { id: itemId, user_id: userId },
      data,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE handler to delete a single Item by ID
export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ itemId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const itemId = (await context.params).itemId;

    // REFACTORED: Use a single 'delete' call. Like 'update', this is an atomic
    // operation that checks ownership and deletes in one step.
    await db.item.delete({
      where: {
        id: itemId,
        user_id: userId, // Enforce ownership
      },
    });

    return NextResponse.json(
      { message: "Item deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
