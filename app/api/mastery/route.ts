import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const concepts = await prisma.concept.findMany({
      where: { projectId },
      orderBy: { masteryScore: "asc" },
    });

    const history = await prisma.masteryHistory.findMany({
      where: {
        userId: user.id,
        concept: { projectId },
      },
      include: {
        concept: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ concepts, history });
  } catch (err: any) {
    console.error("GET /api/mastery error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
