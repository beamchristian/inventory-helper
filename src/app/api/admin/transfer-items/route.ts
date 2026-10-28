import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";
import { normalizeUpc } from "@/lib/items";

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

    // 3. Work out which UPCs the target user already has
    const targetItems = await db.item.findMany({
      where: { user_id: targetUserId },
      select: { upc_number: true },
    });
    const takenUpcs = new Set(
      targetItems.map((item) => normalizeUpc(item.upc_number))
    );

    // 4. Prepare copies of only the new items, assigned to the target user
    const itemsToCreate = [];
    for (const item of sourceItems) {
      const upc = normalizeUpc(item.upc_number);
      if (!upc || takenUpcs.has(upc)) continue;
      takenUpcs.add(upc); // also guards against repeats in the source
      itemsToCreate.push({
        // Do not copy the original item's ID
        name: item.name.trim(),
        upc_number: upc,
        average_weight_per_unit: item.average_weight_per_unit,
        case_quantity: item.case_quantity,
        unit_type: item.unit_type,
        item_type: item.item_type,
        brand: item.brand,
        user_id: targetUserId, // Assign to the new user
      });
    }

    // skipDuplicates is a last line of defence against a concurrent copy
    const result = await db.item.createMany({
      data: itemsToCreate,
      skipDuplicates: true,
    });

    // 5. Return a detailed success response
    const totalSourceItems = sourceItems.length;
    const copiedCount = result.count;
    const skippedCount = totalSourceItems - copiedCount;

    let message = `Copied ${copiedCount} of ${totalSourceItems} items.`;
    if (skippedCount > 0) {
      message += ` ${skippedCount} ${
        skippedCount === 1 ? "item was" : "items were"
      } skipped because the target user already has them.`;
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
