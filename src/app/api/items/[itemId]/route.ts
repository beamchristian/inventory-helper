// src/app/api/items/[itemId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db/db";
import { auth } from "@/lib/auth";

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
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;

    // REFACTORED: Use a single query to find the item ONLY if it belongs to the user.
    const item = await prisma.item.findUnique({
      where: {
        id: params.itemId,
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
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;
    const body = await request.json();

    // REFACTORED: Use a single 'update' call. Prisma will fail with a P2025 error
    // if the 'where' clause doesn't find a matching record (i.e., wrong ID or wrong user).
    // This eliminates the need for a separate 'findUnique' call first.
    const updatedItem = await prisma.item.update({
      where: {
        id: params.itemId,
        user_id: userId, // Enforce ownership
      },
      data: body,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE handler to delete a single Item by ID
export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Authentication required");
    }
    const userId = session.user.id;

    // REFACTORED: Use a single 'delete' call. Like 'update', this is an atomic
    // operation that checks ownership and deletes in one step.
    await prisma.item.delete({
      where: {
        id: params.itemId,
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
