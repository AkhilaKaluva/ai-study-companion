import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await createSession(user.id);

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "LOGIN",
        description: `User ${user.name} logged in successfully.`,
      },
    });

    const redirectTo = user.role === "admin" ? "/admin" : "/dashboard";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirectTo,
    });
  } catch (err: any) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
