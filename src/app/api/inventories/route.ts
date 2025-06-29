// src/app/api/inventories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";

async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("User not authenticated.");
  }
  return session.user.id;
}

// GET all inventories for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession();
    const { searchParams } = new URL(request.url);

    // Get page and limit from query params, with defaults
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Use a transaction to get both the data and the total count efficiently
    const [inventories, totalItems] = await db.$transaction([
      db.inventory.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          created_at: "desc",
        },
        skip: skip,
        take: limit,
      }),
      db.inventory.count({
        where: {
          userId: userId,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    // Return a structured response with data and pagination info
    return NextResponse.json({
      data: inventories,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching user inventories:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch inventories." },
      { status: 500 }
    );
  }
}

// POST a new inventory for the authenticated user
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
    const { name, status, settings } = body; // Destructure expected fields

    if (!name) {
      return NextResponse.json(
        { message: "Inventory name is required." },
        { status: 400 }
      );
    }

    const newInventory = await db.inventory.create({
      data: {
        userId: userId,
        name,
        status: status || "draft", // Default status if not provided
        settings,
      },
    });

    return NextResponse.json(newInventory, { status: 201 });
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
    console.error("Error adding new inventory:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("User not authenticated.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to add inventory." },
      { status: 500 }
    );
  }
}
