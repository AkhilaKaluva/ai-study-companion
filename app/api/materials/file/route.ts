import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { readMaterialFile } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("materialId");
    const isDownload =
      searchParams.get("download") === "1" || searchParams.get("download") === "true";

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing material id" }, { status: 400 });
    }

    const material = await prisma.material.findUnique({
      where: { id },
      include: { project: true },
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

    if (!material.filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readMaterialFile(material.filePath);
    const safeFileName = material.name.replace(/["\r\n]/g, "_");
    const dispositionType = isDownload ? "attachment" : "inline";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${safeFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("GET /api/materials/file error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
