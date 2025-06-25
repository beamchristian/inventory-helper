// src/app/api/items/route.ts
// This API route handles GET and POST operations for all master Items.

import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/auth";

async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Authentication required.");
  }
  return session.user.id;
}

// GET all master items for the authenticated user
export async function GET() {
  try {
    const userId = await getUserIdFromSession();

    const items = await db.item.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        name: "asc", // Order items by name by default
      },
    });

    return NextResponse.json(items);
  } catch (error: unknown) {
    // Fixed: changed 'any' to 'unknown'
    console.error("Error fetching items:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch items." },
      { status: 500 }
    );
  }
}

// POST a new master item for the authenticated user
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
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
        { message: "Name and Unit Type are required." },
        { status: 400 }
      );
    }

    // Ensure average_weight_per_unit is null if unit_type is 'quantity'
    const finalAverageWeight =
      unit_type === "quantity" ? null : average_weight_per_unit;

    const newItem = await db.item.create({
      data: {
        user_id: userId,
        name,
        upc_number: upc_number || null,
        average_weight_per_unit: finalAverageWeight,
        unit_type,
        item_type: item_type || null,
        brand: brand || null,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: unknown) {
    // Fixed: changed 'any' to 'unknown'
    console.error("Error adding new item:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to add item." },
      { status: 500 }
    );
  }
}
