import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

/**
 * POST handler to COPY all master items from a source user to a target user.
 * This is a non-destructive, ADMIN-only action.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { sourceUserId, targetUserId } = body;

    // 1. Validate the input
    if (!sourceUserId || !targetUserId) {
      return NextResponse.json(
        { message: "Source and target user IDs are required." },
        { status: 400 }
      );
    }
    if (sourceUserId === targetUserId) {
      return NextResponse.json(
        { message: "Source and target users cannot be the same." },
        { status: 400 }
      );
    }

    // 2. Fetch all master items from the source user
    const sourceItems = await db.item.findMany({
      where: {
        user_id: sourceUserId,
      },
    });

    if (sourceItems.length === 0) {
      return NextResponse.json({
        message: "The source user has no master items to copy.",
      });
    }

    // 3. Prepare the data for the new copies, assigning to the target user
    const itemsToCreate = sourceItems.map((item) => ({
      // Do not copy the original item's ID
      name: item.name,
      upc_number: item.upc_number,
      average_weight_per_unit: item.average_weight_per_unit,
      unit_type: item.unit_type,
      item_type: item.item_type,
      brand: item.brand,
      user_id: targetUserId, // Assign to the new user
    }));

    // 4. Use createMany with skipDuplicates to efficiently copy items.
    // This will automatically skip any items that would violate the unique
    // constraint (i.e., target user already has an item with that UPC).
    const result = await db.item.createMany({
      data: itemsToCreate,
      skipDuplicates: true,
    });

    // 5. Return a detailed success response
    const totalSourceItems = sourceItems.length;
    const copiedCount = result.count;
    const skippedCount = totalSourceItems - copiedCount;

    let message = `Successfully copied ${copiedCount} of ${totalSourceItems} items.`;
    if (skippedCount > 0) {
      message += ` ${skippedCount} items were skipped, likely due to conflicting UPC codes with the target user.`;
    }

    return NextResponse.json({ message, count: copiedCount });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to copy items", error: errorMessage },
      { status: 500 }
    );
  }
}
