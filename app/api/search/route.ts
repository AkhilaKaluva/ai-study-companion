import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { retrieveProjectContext } from "@/lib/ai/rag";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const rawQ = searchParams.get("q");

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (rawQ === null || typeof rawQ !== "string") {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const query = rawQ.trim();
    if (!query) {
      return NextResponse.json({ error: "Search query cannot be empty" }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: "Search query exceeds maximum allowed length (500 characters)" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { chunks } = await retrieveProjectContext(projectId, query, 10, 0.15);

    const results = chunks.map((chunk) => ({
      chunkId: chunk.chunkId || "",
      materialId: chunk.materialId || "",
      materialName: chunk.materialName,
      pageNumber: chunk.pageNumber,
      content: chunk.content,
      similarity: Number(chunk.similarity.toFixed(4)),
      pageCount: chunk.pageCount ?? null,
    }));

    return NextResponse.json({
      results,
      totalCount: results.length,
      query,
    });
  } catch (err: any) {
    console.error("GET /api/search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
