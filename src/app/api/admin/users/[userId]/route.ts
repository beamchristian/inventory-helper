import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

/**
 * PATCH handler to update a user's role (ADMIN only)
 */
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ userId: string }>;
  }
) {
  try {
    const session = await requireAdmin();
    const userId = (await context.params).userId;
    const { role } = await request.json();

    if (userId === session.user.id) {
      return NextResponse.json(
        { message: "Admins cannot change their own role." },
        { status: 400 }
      );
    }

    if (!role || !Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    // FIXED: Changed 'any' to 'unknown'
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to update user", error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to delete a user (ADMIN only)
 */
export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ userId: string }>;
  }
) {
  try {
    const session = await requireAdmin();
    const userId = (await context.params).userId;

    if (userId === session.user.id) {
      return NextResponse.json(
        { message: "Admins cannot delete themselves." },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    // FIXED: Changed 'any' to 'unknown'
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Failed to delete user", error: errorMessage },
      { status: 500 }
    );
  }
}
