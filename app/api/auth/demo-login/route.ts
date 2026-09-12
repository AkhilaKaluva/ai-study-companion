import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Demo-login is deprecated. Please use real /login with credentials." },
    { status: 410 }
  );
}
