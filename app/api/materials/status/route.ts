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
    const materialId = searchParams.get("materialId");

    if (materialId) {
      const material = await prisma.material.findFirst({
        where: {
          id: materialId,
          project: {
            ...(user.role === "admin" ? {} : { userId: user.id }),
          },
        },
        include: {
          _count: {
            select: { chunks: true },
          },
        },
      });

      if (!material) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }

      return NextResponse.json({ material });
    }

    if (projectId) {
      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ...(user.role === "admin" ? {} : { userId: user.id }),
        },
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const materials = await prisma.material.findMany({
        where: { projectId },
        include: {
          _count: {
            select: { chunks: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ materials });
    }

    return NextResponse.json({ error: "Missing projectId or materialId" }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/materials/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

