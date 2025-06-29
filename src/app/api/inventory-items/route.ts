// src/app/api/inventory-items/route.ts
// This file defines the API endpoint for handling POST requests to /api/inventory-items
// This route is specifically for CREATING NEW MASTER ITEMS (used by /settings page)

import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";

/**
 * Handles POST requests to create a new Master Item.
 * @param {Request} req - The incoming request object.
 * @returns {NextResponse} The response object indicating success or failure.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      name,
      upc_number,
      average_weight_per_unit,
      unit_type,
      item_type,
      brand,
    } = body;

    if (!name || !unit_type) {
      return NextResponse.json(
        { message: "Name and Unit Type are required" },
        { status: 400 }
      );
    }

    const finalAverageWeight =
      unit_type === "quantity" ? null : average_weight_per_unit;

    const newMasterItem = await db.item.create({
      data: {
        user_id: session.user.id,
        name,
        upc_number: upc_number || null,
        average_weight_per_unit: finalAverageWeight,
        unit_type,
        item_type: item_type || null,
        brand: brand || null,
      },
    });

    return NextResponse.json(newMasterItem, { status: 201 });
  } catch (error: unknown) {
    // Fixed: changed 'any' to 'unknown'
    console.error("Error creating master item:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          message: "Failed to create master item",
          error: errorMessage, // Use errorMessage here
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Failed to create master item" },
      { status: 500 }
    );
  }
}
