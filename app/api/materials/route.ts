import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import fs from "fs";
import path from "path";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id") || searchParams.get("materialId");
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.materialId;
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing material id" }, { status: 400 });
    }

    // Verify that the Material exists and load its parent project
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Verify that the authenticated student owns the project containing this material (or admin)
    if (user.role !== "admin" && material.project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this material" },
        { status: 403 }
      );
    }

    // 1. Remove the corresponding stored PDF file if it exists
    if (material.filePath) {
      try {
        const relativePath = material.filePath.startsWith("/")
          ? material.filePath.slice(1)
          : material.filePath;
        const resolvedDiskPath = path.resolve(process.cwd(), "public", relativePath);
        const publicDir = path.resolve(process.cwd(), "public");

        // Secure check: verify path is strictly within the public directory
        if (resolvedDiskPath.startsWith(publicDir) && fs.existsSync(resolvedDiskPath)) {
          fs.unlinkSync(resolvedDiskPath);
        }
      } catch (fileErr) {
        console.warn("Could not delete physical file:", fileErr);
      }
    }

    // 2. Remove the Material record (Prisma schema cascades deletion to MaterialChunk records)
    await prisma.material.delete({
      where: { id: material.id },
    });

    // 3. Record MATERIAL_DELETED activity event
    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        projectId: material.projectId,
        type: "MATERIAL_DELETED",
        description: `Deleted material "${material.name}" from project "${material.project.name}".`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/materials error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
