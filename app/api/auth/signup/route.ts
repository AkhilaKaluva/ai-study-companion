import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        passwordHash,
        role: "student",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await createSession(user.id);

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "SIGNUP",
        description: `Student account created for ${user.name}.`,
      },
    });

    return NextResponse.json({
      success: true,
      user,
      redirectTo: "/dashboard",
    });
  } catch (err: any) {
    console.error("POST /api/auth/signup error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup." },
      { status: 500 }
    );
  }
}
