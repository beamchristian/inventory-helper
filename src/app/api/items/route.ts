import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";
import {
  duplicateItemMessage,
  findDuplicateItem,
  isUniqueConstraintError,
  normalizeUpc,
  UPC_REQUIRED_MESSAGE,
  CASE_QUANTITY_MESSAGE,
  parseCaseQuantity,
} from "@/lib/items";

async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Authentication required.");
  }
  return session.user.id;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession();
    const { searchParams } = new URL(request.url);

    // Check if the request is for ALL items
    if (searchParams.get("all") === "true") {
      const allItems = await db.item.findMany({
        where: { user_id: userId },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(allItems); // Return a simple array
    }

    // Otherwise, handle the paginated request
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Optional search across name, UPC, brand and type (case-insensitive)
    const query = searchParams.get("q")?.trim();
    const where: Prisma.ItemWhereInput = { user_id: userId };
    if (query) {
      where.OR = (["name", "upc_number", "brand", "item_type"] as const).map(
        (field) => ({ [field]: { contains: query, mode: "insensitive" } }),
      );
    }

    const [items, totalItems] = await db.$transaction([
      db.item.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      db.item.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error: unknown) {
    // Fixed: changed 'any' to 'unknown'
    console.error("Error fetching items:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to fetch items." },
      { status: 500 },
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
      case_quantity,
      unit_type,
      item_type,
      brand,
    } = body;

    if (typeof name !== "string" || !name.trim() || !unit_type) {
      return NextResponse.json(
        { message: "Name and Unit Type are required." },
        { status: 400 },
      );
    }

    // Ensure average_weight_per_unit is null if unit_type is 'quantity'
    const finalAverageWeight =
      unit_type === "quantity" ? null : average_weight_per_unit;

    // Units per case is optional, but must be a whole number when given
    const caseQuantity = parseCaseQuantity(case_quantity);
    if (caseQuantity === undefined) {
      return NextResponse.json(
        { message: CASE_QUANTITY_MESSAGE },
        { status: 400 },
      );
    }

    // Every item needs a UPC, and a UPC can only be used once per user
    const upc = normalizeUpc(upc_number);
    if (!upc) {
      return NextResponse.json(
        { message: UPC_REQUIRED_MESSAGE },
        { status: 400 },
      );
    }
    const existing = await findDuplicateItem(userId, upc);
    if (existing) {
      return NextResponse.json(
        { message: duplicateItemMessage(existing) },
        { status: 409 },
      );
    }

    const newItem = await db.item.create({
      data: {
        user_id: userId,
        name: name.trim(),
        upc_number: upc,
        average_weight_per_unit: finalAverageWeight,
        case_quantity: caseQuantity,
        unit_type,
        item_type: item_type || null,
        brand: brand || null,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: unknown) {
    // Fixed: changed 'any' to 'unknown'
    console.error("Error adding new item:", error);
    // A concurrent request created the same UPC between our check and insert
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { message: "An item with this UPC already exists." },
        { status: 409 },
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("Authentication required.")) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { message: errorMessage || "Failed to add item." },
      { status: 500 },
    );
  }
}
