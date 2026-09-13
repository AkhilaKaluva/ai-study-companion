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
    const id = searchParams.get("id") || searchParams.get("materialId");

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing material id" }, { status: 400 });
    }

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        project: true,
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            pageNumber: true,
            content: true,
          },
          orderBy: {
            chunkIndex: "asc",
          },
        },
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (user.role !== "admin" && material.project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this material" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      material: {
        id: material.id,
        name: material.name,
        status: material.status,
        pageCount: material.pageCount,
        fileSizeBytes: material.fileSizeBytes,
        errorMessage: material.errorMessage,
        createdAt: material.createdAt,
        chunkCount: material._count.chunks,
      },
      chunks: material.chunks,
    });
  } catch (err: any) {
    console.error("GET /api/materials/chunks error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
