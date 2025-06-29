import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // <-- Import the auth object from your auth.ts
import { db } from "@/lib/db/db"; // Adjust this path to your prisma client

export async function GET() {
  // Use the new `auth()` helper to get the session
  const session = await auth();

  // 1. Check if user is authenticated
  if (!session?.user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // 2. Check if user has the ADMIN role
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 3. If user is an admin, fetch all users
  try {
    const users = await db.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching users." },
      { status: 500 }
    );
  }
}
