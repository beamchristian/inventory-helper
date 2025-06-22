// src/app/api/inventories/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db/db";
import { auth } from "@/lib/auth";

async function getUserIdFromSession() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("User not authenticated.");
  }
  return session.user.id;
}

// GET all inventories for the authenticated user
export async function GET() {
  try {
    const userId = await getUserIdFromSession();

    const inventories = await prisma.inventory.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(inventories);
  } catch (error: unknown) {
    // Changed 'any' to 'unknown'
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

    const newInventory = await prisma.inventory.create({
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
