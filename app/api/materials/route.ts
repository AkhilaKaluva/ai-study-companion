import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteMaterialFile } from "@/lib/storage";

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

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (user.role !== "admin" && material.project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this material" },
        { status: 403 }
      );
    }

    if (material.filePath) {
      await deleteMaterialFile(material.filePath);
    }

    await prisma.material.delete({
      where: { id: material.id },
    });

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
