import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true, redirectTo: "/" });
  } catch (err: any) {
    console.error("POST /api/auth/logout error:", err);
    return NextResponse.json(
      { error: "Failed to log out cleanly." },
      { status: 500 }
    );
  }
}
