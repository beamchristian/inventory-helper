import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// Function to check for ADMIN role
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

/**
 * GET handler to fetch all users (ADMIN only)
 */
// FIXED: Renamed 'request' to '_request' to indicate it's unused.
export async function GET() {
  try {
    await requireAdmin();

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    // FIXED: Changed 'any' to 'unknown' for better type safety.
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to fetch users", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new user (ADMIN only)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    // FIXED: Changed 'any' to 'unknown' for better type safety.
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to create user", error: errorMessage },
      { status: 500 }
    );
  }
}
