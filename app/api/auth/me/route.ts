import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("GET /api/auth/me error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
