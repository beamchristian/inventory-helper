// src/app/api/inventory-items/route.ts
// This file defines the API endpoint for handling POST requests to /api/inventory-items
// This route is specifically for CREATING NEW MASTER ITEMS (used by /settings page)

import { NextResponse } from "next/server";
// Import the shared prisma client instance (singleton)
import prisma from "@/lib/db/db"; // <--- CORRECTED: Using shared instance
import { auth } from "@/lib/auth"; // Import your custom auth helper

// The prisma client is now imported, not instantiated locally.
// const prisma = new PrismaClient(); // REMOVED: No local instantiation

/**
 * Handles POST requests to create a new Master Item.
 * This function will receive data from the frontend form submission
 * and create a new record in the database.
 *
 * @param {Request} req - The incoming request object.
 * @returns {NextResponse} The response object indicating success or failure.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate and authorize the user
    // Get the server-side session using the 'auth' helper from your lib/auth.ts
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      // If no session or user ID, return an unauthorized response
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the request body
    // The request body is expected to contain the new master item data
    const body = await req.json();

    // 3. Destructure and validate the required fields from the request body
    const {
      name,
      upc_number,
      average_weight_per_unit,
      unit_type,
      item_type,
      brand,
    } = body;

    // Basic validation: ensure 'name' and 'unit_type' are provided
    if (!name || !unit_type) {
      return NextResponse.json(
        { message: "Name and Unit Type are required" },
        { status: 400 }
      );
    }

    // Ensure average_weight_per_unit is null if unit_type is 'quantity'
    const finalAverageWeight =
      unit_type === "quantity" ? null : average_weight_per_unit;

    // 4. Create the new master item in the database
    const newMasterItem = await prisma.item.create({
      data: {
        user_id: session.user.id, // Associate the item with the logged-in user
        name,
        upc_number: upc_number || null, // Ensure UPC can be null if not provided
        average_weight_per_unit: finalAverageWeight,
        unit_type,
        item_type: item_type || null, // Ensure item_type can be null
        brand: brand || null, // Ensure brand can be null
        // created_at and updated_at are typically handled automatically by Prisma with `@@map`
      },
    });

    // 5. Return a success response with the created item
    return NextResponse.json(newMasterItem, { status: 201 }); // 201 Created status
  } catch (error: any) {
    // 6. Handle errors
    console.error("Error creating master item:", error);

    // Provide a more descriptive error message in development
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          message: "Failed to create master item",
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    // For production, return a generic error message
    return NextResponse.json(
      { message: "Failed to create master item" },
      { status: 500 }
    );
  }
  // REMOVED: finally block with prisma.$disconnect()
}
