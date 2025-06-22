// src/app/api/items/route.ts
// This API route handles fetching all Items for the authenticated user.

import { NextResponse } from "next/server";
import prisma from "@/lib/db/db"; // Your Prisma client instance
import { auth } from "@/lib/auth"; // Your NextAuth.js server-side auth helper

// Helper to get userId securely on the server
async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    // Return a specific error message for unauthenticated users
    throw new Error("Authentication required.");
  }
  return session.user.id;
}

// GET handler to fetch all Items for the authenticated user
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession(); // Authenticate and get user ID

    // Fetch all items that belong to the authenticated user
    const items = await prisma.item.findMany({
      where: {
        user_id: userId, // Filter items by the authenticated user's ID
      },
      orderBy: {
        created_at: "desc", // Order by creation date, most recent first
      },
    });

    return NextResponse.json(items); // Return the fetched items as JSON
  } catch (error: any) {
    console.error("Error fetching items:", error); // Log the error for debugging
    if (error.message === "Authentication required.") {
      // Return 401 Unauthorized if authentication failed
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    // Return 500 Internal Server Error for other unexpected errors
    return NextResponse.json(
      { message: error.message || "Failed to fetch items." },
      { status: 500 }
    );
  }
}

// You might also add POST, PATCH, DELETE handlers for items in this file if needed.
// Example POST for creating a new item:

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
    // Validate body content, e.g., using Zod as per your schema import earlier
    const newItem = await prisma.item.create({
      data: {
        user_id: userId,
        name: body.name,
        unit_type: body.unit_type,
        // ... other fields
      },
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error("Error creating item:", error);
    if (error.message === "Authentication required.") {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: error.message || "Failed to create item." },
      { status: 500 }
    );
  }
}
